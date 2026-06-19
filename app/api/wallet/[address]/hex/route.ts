import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/wallet-tokens";
import { runHolderTick } from "@/lib/holder-tick";
import { processSweepsForWallet } from "@/lib/sweep-inline";
import { getWalletHex } from "@/lib/wallet-hex-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { requireProvenWallet } from "@/lib/x-session";

export const dynamic = "force-dynamic";

// Hard deadline wrapper — returns fallback if the promise hasn't resolved in time.
// Prevents one slow upstream (OpenSea, RPC, Upstash) from hanging the route past
// Vercel's serverless timeout.
async function withDeadline<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * GET /api/wallet/[address]/hex
 * Runs the pull-based holder tick (catch up since last snapshot), then
 * returns the current per-wallet hex balance + recent earnings log.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const rl = await limit(req, "wallet:hex", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  // Each tick wrapped in a deadline — if OpenSea/RPC stalls, return zero
  // credit instead of blocking. User's persisted balance is still returned.
  // Run in parallel (was sequential — summed deadlines blew past Vercel's 10s
  // serverless limit). Each tick has its own deadline; the longest controls
  // total wall time.
  const tickFallback = { daysCredited: 0, hexCredited: 0, balance: 0, tier: "Initiate", multiplier: 1, civBonusPct: 0, honoraryCount: 0, oneOfOneCount: 0 };
  const sweepFallback = { credited: 0, hex: 0, bonus: false };

  // HEX-SECURITY (2026-06-09, red-team finding A): the holder/defender/sweep
  // ticks each CREDIT real HEX. They must run only for the authenticated wallet
  // owner (one-time walletProof signature), never for an unauthenticated caller
  // who can pass any address in the path. Non-owners get a read-only balance —
  // crediting is skipped (fallbacks returned), so the GET can no longer mint HEX
  // for an arbitrary address. walletProof rule preserved; balance read unchanged.
  const isOwner = !!requireProvenWallet(req, address);

  const [tick, sweep] = isOwner
    ? await Promise.all([
        withDeadline(runHolderTick(address), 7000, tickFallback),
        withDeadline(processSweepsForWallet(address), 7000, sweepFallback),
      ])
    : [tickFallback, sweepFallback];
  const rec = await getWalletHex(address);

  return NextResponse.json({
    address: rec.address,
    balance: rec.balance,
    lifetimeEarned: rec.lifetimeEarned,
    lastHolderTickDay: rec.lastHolderTickDay,
    claimStreak: rec.claimStreak ?? 0,
    tick,
    // floor-defender is RETIRED (always-zero no-op). Keep the key for response-
    // shape stability; return a static stub instead of a Redis GET+SET per call.
    defenderTick: { qualifyingTokens: 0, hexCredited: 0, daysCredited: 0 },
    sweep,
    events: rec.events.slice(0, 20),
  });
}
