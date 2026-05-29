import { NextResponse } from "next/server";
import { isValidAddress, getWalletTokens } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { accrueWallet, derivedCastes, getCityState } from "@/lib/city-store";
import {
  civsLitAt,
  companionMultiplier,
  reclaimMultiplier,
  setMultiplier,
} from "@/lib/city-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/city/collect  { address }
 * The heartbeat. Server-authoritative accrual: credits signal generated since
 * the wallet's last tick using the SERVER clock (capped), refreshing the
 * holder multiplier from verified on-chain ownership. Returns the gain so the
 * client can show "while you were dark, the city generated X".
 *
 * Same-origin only. Address is self-reported but this is safe: the only signal
 * source here is bounded time-accrual against server-stored structures — there
 * is no faucet to spoof, and crediting someone else's address only helps them.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "city:collect", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { address?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const address = (body.address || "").toLowerCase();
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  // Verified ownership → refresh cached balance + caste set for the multiplier
  // and build gating. Tolerate OpenSea/RPC failure (accrue with cached values).
  let ownership: { balance: number; castes: ReturnType<typeof derivedCastes> } | undefined;
  try {
    const tokens = await getWalletTokens(address, 500);
    if (tokens) {
      ownership = {
        balance: tokens.balance,
        castes: derivedCastes(tokens.tokenIds),
      };
    }
  } catch {
    /* fall through — accrue with whatever is cached on the record */
  }

  const { wallet, gain } = await accrueWallet(address, ownership);
  const state = await getCityState();

  return NextResponse.json({
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
      setTiers: wallet.setTiers,
      setMultiplier: setMultiplier(wallet.setTiers),
      oogieCount: wallet.oogieCount,
      companionMultiplier: companionMultiplier(wallet.oogieCount),
      cryptCount: wallet.cryptCount,
      reclaimMultiplier: reclaimMultiplier(wallet.cryptCount),
    },
    gain,
  });
}
