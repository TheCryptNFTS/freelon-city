import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCityState, getCityWallet } from "@/lib/city-store";
import {
  civsLitAt,
  companionMultiplier,
  reclaimMultiplier,
  setMultiplier,
} from "@/lib/city-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/city/state?addr=0x...
 * Read-only snapshot of the global city plus the caller's stored slice.
 * Does NOT accrue or touch OpenSea — cheap enough to poll for the public
 * progress bar. Players reconcile (and earn) via POST /api/city/collect.
 */
export async function GET(req: Request) {
  const rl = await limit(req, "city:state", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const addr = (url.searchParams.get("addr") || "").toLowerCase();

  const state = await getCityState();
  const wallet =
    addr && isValidAddress(addr) ? await getCityWallet(addr) : null;

  return NextResponse.json({
    state: {
      season: state.season,
      totalSignal: state.totalSignal,
      lit: civsLitAt(state.totalSignal),
    },
    wallet: wallet
      ? {
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
        }
      : null,
  });
}
