import { NextResponse } from "next/server";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { addOwned, getGlobalSold, getOwned, incrementSold } from "@/lib/shop-store";
import { getItem } from "@/lib/shop";
import { normalizeHandle, syncHandle } from "@/lib/sync";
import { CarrierState, POINTS } from "@/lib/carrier";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { requireXSession } from "@/lib/require-x";
import { requireProvenWallet } from "@/lib/x-session";
import { walletFromSession, foldCarrierIntoWallet } from "@/lib/hex-spend";
import { debitWalletHex, getWalletHex, InsufficientHexError } from "@/lib/wallet-hex-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayKey() {
  return Math.floor(Date.now() / 86400000);
}

type Body = {
  handle?: string;
  itemId?: string;
};

export async function POST(req: Request) {
  const rl = await limit(req, "shop-buy", { max: 10 });
  if (!rl.ok) return tooManyResponse(rl);

  const body = (await req.json().catch(() => ({}))) as Body;
  const handle = normalizeHandle(body.handle ?? "");
  const itemId = (body.itemId ?? "").trim();

  if (!handle) {
    return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  }
  // Require verified X session bound to this handle
  const session = await requireXSession(req, { handle });
  if (session instanceof NextResponse) return session;
  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const item = getItem(itemId);
  if (!item) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }

  // Load or lazily initialize the carrier
  let carrier = await getCarrier(handle);
  if (!carrier) {
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

  // 2026-05-29 ledger unification: if this session carries a real wallet,
  // the shop spends from the WALLET ledger (where hex is actually earned).
  // Otherwise (handle-only relayer, no wallet) fall back to carrier-hex.
  const wallet = walletFromSession(session);

  // Supply check (limited items only) — runs before any debit.
  if (item.supply !== null && item.supply !== undefined) {
    const sold = await getGlobalSold(item.id);
    if (sold >= item.supply) {
      return NextResponse.json({ error: "sold out", supply: item.supply, sold }, { status: 409 });
    }
  }

  // Already-owned check (idempotent) — before debit so re-clicks don't charge.
  const owned = await getOwned(handle);
  if (owned.includes(item.id)) {
    return NextResponse.json({ error: "already owned", state: carrier }, { status: 409 });
  }

  if (wallet) {
    // Spending wallet-ledger ⬡ requires a PROVEN wallet (one-time signature).
    // `session.bind` is attacker-chooseable at OAuth start, so it can never
    // authorize a debit — otherwise an attacker could bind a victim's wallet
    // and burn their HEX on shop items. Gate before the fold + debit.
    if (!requireProvenWallet(req, wallet)) {
      return NextResponse.json(
        { error: "wallet_proof_required", message: "Sign with your wallet once to spend ⬡." },
        { status: 401 },
      );
    }
    // Fold any leftover carrier-hex into the wallet first (idempotent), so
    // previously-earned/relayed hex is spendable in the shop.
    await foldCarrierIntoWallet(handle, wallet);
    try {
      await debitWalletHex(wallet, item.cost, { kind: "manual", note: `Shop: ${item.id}` });
    } catch (e) {
      if (e instanceof InsufficientHexError) {
        return NextResponse.json(
          { error: "insufficient hex points", required: e.requested, have: e.balance },
          { status: 402 },
        );
      }
      throw e;
    }
    await addOwned(handle, item.id);
    await incrementSold(item.id);
    const sold = await getGlobalSold(item.id);
    const rec = await getWalletHex(wallet);
    // Keep returning a carrier-shaped `state` for the client, but with the
    // authoritative wallet balance mirrored into hexPoints so the UI total
    // reflects the real spendable number.
    const folded = await getCarrier(handle);
    return NextResponse.json({
      ok: true,
      state: { ...(folded ?? carrier), hexPoints: rec.balance },
      walletBalance: rec.balance,
      item,
      sold,
    });
  }

  // Legacy carrier-hex path (handle-only, no wallet bound).
  if (carrier.hexPoints < item.cost) {
    return NextResponse.json(
      { error: "insufficient hex points", required: item.cost, have: carrier.hexPoints },
      { status: 402 },
    );
  }
  const next: CarrierState = {
    ...carrier,
    hexPoints: carrier.hexPoints - item.cost,
    totalSpent: carrier.totalSpent + item.cost,
  };
  await putCarrier(next);
  await addOwned(handle, item.id);
  await incrementSold(item.id);

  const sold = await getGlobalSold(item.id);
  return NextResponse.json({
    ok: true,
    state: next,
    item,
    sold,
  });
}
