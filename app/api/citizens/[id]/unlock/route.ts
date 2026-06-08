import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { verifyOwnership } from "@/lib/owner-of";
import { createUnlockQuote, verifyUnlockPayment, type UnlockKind } from "@/lib/payments/unlock-orders";
import { activate, recharge, getUnlock, unlockStatus } from "@/lib/missions/unlock-store";
import { PAYMENTS_LIVE } from "@/lib/missions/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  → public unlock info for a citizen: its tier, price, quota, and whether
 *        it's already unlocked. Drives the dashboard CTA + meter.
 * POST  → owner-gated. action:"quote" returns an exact-ETH quote; action:"claim"
 *        verifies the tx on-chain and records the unlock (survives resale).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:unlock:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!citizen) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const s = await unlockStatus(cid);
  return NextResponse.json({
    tier: s.tier,
    priceEth: s.priceEth,
    rechargeEth: s.rechargeEth,
    grantPerUnlock: s.grantPerUnlock,
    credits: s.credits,
    unlocked: s.unlocked,
    paymentsLive: PAYMENTS_LIVE,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:unlock", { max: 12, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!citizen) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  if (!PAYMENTS_LIVE) return NextResponse.json({ error: "payments_not_live" }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: "quote" | "claim";
    kind?: UnlockKind; // "activate" (default) | "recharge"
    address?: string;
    signature?: string;
    txHash?: string;
  };
  const kind: UnlockKind = body.kind === "recharge" ? "recharge" : "activate";

  // Auth: bound session OR wallet signature (same pattern as the mission rail).
  let wallet: string | null = null;
  const session = getSessionFromRequest(req);
  if (session && /^0x[a-f0-9]{40}$/.test((session.bind || "").toLowerCase())) {
    wallet = session.bind.toLowerCase();
  } else if (body.address && body.signature) {
    const address = body.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
    const message = `I am unlocking FREELON CITY agent #${cid}.`;
    let ok = false;
    try { ok = await verifyMessage({ address: address as `0x${string}`, message, signature: body.signature as `0x${string}` }); } catch { ok = false; }
    if (!ok) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    wallet = address;
  }
  if (!wallet) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const verdict = await verifyOwnership(cid, wallet);
  if (verdict.status === "unknown") return NextResponse.json({ error: "ownership_unverified" }, { status: 503 });
  if (verdict.status === "not-owner") return NextResponse.json({ error: "not_owner" }, { status: 403 });

  const existing = await getUnlock(cid);
  // Guard the kinds: can't re-activate an active citizen; can't recharge a
  // citizen that was never activated.
  if (kind === "activate" && existing?.activated) {
    return NextResponse.json({ ok: true, already: true });
  }
  if (kind === "recharge" && !existing?.activated) {
    return NextResponse.json({ error: "not_activated", message: "Activate this FREELON first, then you can recharge." }, { status: 409 });
  }

  if (body.action === "quote") {
    const quote = await createUnlockQuote({ wallet, tokenId: cid, kind });
    if ("error" in quote) return NextResponse.json({ error: quote.error }, { status: 502 });
    return NextResponse.json({
      ok: true,
      kind,
      tier: quote.tier,
      amountEth: quote.ethLabel,
      amountWei: quote.wei,
      toWallet: quote.toWallet,
      expiresAt: quote.expiresAt,
    });
  }

  if (body.action === "claim") {
    const txHash = typeof body.txHash === "string" ? body.txHash : "";
    if (!txHash) return NextResponse.json({ error: "payment_required" }, { status: 402 });
    const v = await verifyUnlockPayment({ wallet, tokenId: cid, txHash, kind });
    if (!v.ok) {
      const retry = v.error === "awaiting_confirmations" || v.error === "tx_not_found_yet";
      return NextResponse.json({ error: v.error }, { status: retry ? 425 : 402 });
    }
    const rec = v.order.kind === "recharge"
      ? await recharge({ tokenId: cid, txHash, priceEthPaid: v.order.priceEth })
      : await activate({ tokenId: cid, txHash, priceEthPaid: v.order.priceEth });
    if (!rec) return NextResponse.json({ error: "not_activated" }, { status: 409 });
    // Single-currency model (2026-06-04): the ETH unlock drops BONUS HEX in the
    // holder's wallet — the fuel for premium runs, which are now priced in HEX.
    // bonus = tier.runs × per-run rate. Best-effort: never fail the unlock over it
    // (the tx is already deduped, so this credits once per valid payment).
    let bonusHex = 0;
    try {
      const { unlockTierFor } = await import("@/lib/missions/unlock");
      const { UNLOCK_BONUS_HEX_PER_RUN } = await import("@/lib/economy-constants");
      const { creditWalletHex } = await import("@/lib/wallet-hex-store");
      bonusHex = unlockTierFor(rec.tier).runs * UNLOCK_BONUS_HEX_PER_RUN;
      if (bonusHex > 0) {
        await creditWalletHex(wallet, bonusHex, {
          kind: "manual",
          note: `Unlock bonus · #${String(cid).padStart(4, "0")} (+${bonusHex}⬡)`,
        });
      }
    } catch { /* bonus credit is non-critical */ }
    return NextResponse.json({ ok: true, unlocked: true, kind: v.order.kind, tier: rec.tier, bonusHex, credits: rec.credits });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
