import { NextResponse } from "next/server";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { hasUnlocked, unlock, isCitizenGifted } from "@/lib/unlock-store";
import { unlockCost } from "@/lib/deep-lore";
import { normalizeHandle, syncHandle } from "@/lib/sync";
import { getCitizen } from "@/lib/citizens";
import { COST, CarrierState, POINTS } from "@/lib/carrier";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { requireXSession } from "@/lib/require-x";
import { requireProvenWallet } from "@/lib/x-session";
import { walletFromSession, foldCarrierIntoWallet } from "@/lib/hex-spend";
import { debitWalletHex, getWalletHex, InsufficientHexError } from "@/lib/wallet-hex-store";

function dayKey() { return Math.floor(Date.now() / 86400000); }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  /** "self" = unlock for self, "gift" = unlock and gift to recipient */
  action: "self" | "gift";
  /** carrier handle */
  handle: string;
  /** recipient handle (for gift action) */
  recipient?: string;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "unlock-get", { max: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  const url = new URL(req.url);
  const handle = normalizeHandle(url.searchParams.get("h") ?? "");
  if (!handle) return NextResponse.json({ unlocked: false });
  const unlocked = await hasUnlocked(handle, cid);
  const gift = await isCitizenGifted(cid);
  return NextResponse.json({ unlocked, gift });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "unlock-post", { max: 12 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!citizen) return NextResponse.json({ error: "citizen not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const action = body.action;
  const handle = normalizeHandle(body.handle ?? "");
  const recipient = body.recipient ? normalizeHandle(body.recipient) : null;

  if (!handle) return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  if (action === "gift" && !recipient) return NextResponse.json({ error: "recipient required for gift" }, { status: 400 });

  // Require verified X session bound to the payer's handle (mutations only)
  const session = await requireXSession(req, { handle });
  if (session instanceof NextResponse) return session;

  let carrier = await getCarrier(handle);
  if (!carrier) {
    // Lazily initialize so the unlock flow doesn't require a separate /carrier visit
    const s = syncHandle(handle);
    carrier = {
      handle,
      civilization: s.civilization,
      rank: 20,
      streak: 1,
      lastActiveDay: dayKey(),
      totalRelays: 0,
      hexPoints: POINTS.STARTING,
      totalEarned: POINTS.STARTING,
      totalSpent: 0,
    };
    await putCarrier(carrier);
  }

  const cost = action === "gift" ? COST.GIFT_UNLOCK : unlockCost(cid);

  // 2026-05-29 ledger unification: spend the WALLET ledger when a wallet is
  // bound to the session; else fall back to legacy carrier-hex.
  const wallet = walletFromSession(session);

  async function recordUnlock() {
    if (action === "self") {
      await unlock(handle, cid);
    } else if (action === "gift") {
      await unlock(recipient!, cid, handle);
    }
  }

  if (wallet) {
    // Spending wallet-ledger ⬡ requires a PROVEN wallet (one-time signature).
    // `session.bind` is attacker-chooseable at OAuth start, so it can never
    // authorize a debit — otherwise an attacker could bind a victim's wallet
    // and burn their HEX on unlocks keyed to the attacker's own handle.
    // Same gate as /api/shop/buy; closed 2026-06-10 (ultracode audit).
    if (!requireProvenWallet(req, wallet)) {
      return NextResponse.json(
        { error: "wallet proof required — sign once with your wallet to spend ⬡" },
        { status: 401 },
      );
    }
    await foldCarrierIntoWallet(handle, wallet);
    try {
      await debitWalletHex(wallet, cost, { kind: "manual", note: `Unlock #${cid} (${action})` });
    } catch (e) {
      if (e instanceof InsufficientHexError) {
        return NextResponse.json({ error: "insufficient hex points", required: e.requested, have: e.balance }, { status: 402 });
      }
      throw e;
    }
    await recordUnlock();
    const rec = await getWalletHex(wallet);
    const folded = await getCarrier(handle);
    return NextResponse.json({
      ok: true,
      state: { ...(folded ?? carrier), hexPoints: rec.balance },
      walletBalance: rec.balance,
      cost, action, citizenId: cid, recipient,
    });
  }

  // Legacy carrier-hex path (handle-only, no wallet bound).
  if (carrier.hexPoints < cost) {
    return NextResponse.json({ error: "insufficient hex points", required: cost, have: carrier.hexPoints }, { status: 402 });
  }
  const next: CarrierState = {
    ...carrier,
    hexPoints: carrier.hexPoints - cost,
    totalSpent: carrier.totalSpent + cost,
  };
  await putCarrier(next);
  await recordUnlock();

  return NextResponse.json({ ok: true, state: next, cost, action, citizenId: cid, recipient });
}
