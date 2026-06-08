import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import {
  creditWalletHex,
  debitWalletHex,
  getWalletHex,
  InsufficientHexError,
} from "@/lib/wallet-hex-store";
import { requireXSession } from "@/lib/require-x";
import { applyBoost, getCityState } from "@/lib/city-store";
import { BOOST_RATE, MIN_BOOST_HEX, civsLitAt } from "@/lib/city-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/city/boost  { address, hex }
 * Burn real hex to inject city signal (a "tithe to the city"). This is the
 * single bridge to the live hex economy and it is a SINK ONLY — it debits real
 * hex and credits the isolated city ledger; it never mints hex.
 *
 * Auth mirrors /api/tithe exactly, because this spends real currency:
 *   1. same-origin (CSRF)
 *   2. verified X session BOUND to the burning wallet — without the bind check
 *      any signed-in user could drain any wallet by passing its address.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "city:boost", { max: 10, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { address?: string; hex?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const address = (body.address || "").toLowerCase();
  const hex = Math.floor(Number(body.hex || 0));
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!Number.isFinite(hex) || hex < MIN_BOOST_HEX) {
    return NextResponse.json(
      { error: `min_boost_${MIN_BOOST_HEX}` },
      { status: 400 },
    );
  }

  // The burning wallet must be CRYPTOGRAPHICALLY PROVEN by this session
  // (one-time personal_sign → walletProof), not merely the forgeable `bind`.
  // Trusting `bind` let any signed-in user drain a victim's wallet by address.
  const session = await requireXSession(req, {});
  if (session instanceof NextResponse) return session;
  const { requireProvenWallet } = await import("@/lib/x-session");
  if (!requireProvenWallet(req, address)) {
    return NextResponse.json(
      { error: "wallet_proof_required", message: "Sign with your wallet once to spend ⬡." },
      { status: 401 },
    );
  }

  // Burn real hex (the sink), then credit the city ledger.
  try {
    await debitWalletHex(address, hex, {
      kind: "manual",
      note: "city boost",
    });
  } catch (e) {
    if (e instanceof InsufficientHexError) {
      return NextResponse.json(
        { error: "insufficient_hex", balance: e.balance, requested: e.requested },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "debit_failed" }, { status: 500 });
  }

  // Credit the isolated city ledger. If this write fails AFTER the hex debit
  // already landed, refund the hex — the debit and the city credit must not
  // diverge, or an infra hiccup would silently burn a user's hex for nothing.
  const citySignal = hex * BOOST_RATE;
  let wallet;
  try {
    wallet = await applyBoost(address, citySignal);
  } catch {
    try {
      await creditWalletHex(address, hex, {
        kind: "manual",
        note: "city boost refund (ledger write failed)",
      });
    } catch {
      /* refund itself failed — surfaced as boost_failed for manual reconcile */
    }
    return NextResponse.json({ error: "boost_failed" }, { status: 500 });
  }
  const state = await getCityState();
  const ledger = await getWalletHex(address);

  return NextResponse.json({
    burned: hex,
    citySignal,
    hexBalance: ledger.balance,
    state: {
      season: state.season,
      totalSignal: state.totalSignal,
      lit: civsLitAt(state.totalSignal),
    },
    wallet: {
      signal: wallet.signal,
      contributed: wallet.contributed,
      structures: wallet.structures,
      balance: wallet.balance,
      castes: wallet.castes,
    },
  });
}
