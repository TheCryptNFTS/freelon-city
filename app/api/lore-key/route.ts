import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { walletHoldsCollection } from "@/lib/signal-set";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/lore-key?addr=0x...
 * Emile = "Memory Fragments" → the lore-unlock key. Reports whether a wallet
 * holds ≥1 Emile, which the client uses to reveal every citizen's deep lore
 * for free (mirroring the owner-free gate). Read-only: touches no ledger and
 * mints no hex — it only WAIVES the optional hex unlock-sink, so it stays
 * inside the locked economy-isolation rule.
 *
 * Fail-safe: an unknown/failed lookup returns key:false, so an OpenSea outage
 * never falsely hands out the master key.
 */
export async function GET(req: Request) {
  const rl = await limit(req, "lore-key", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const addr = (url.searchParams.get("addr") || "").toLowerCase();
  if (!isValidAddress(addr)) return NextResponse.json({ key: false });

  const holds = await walletHoldsCollection(addr, "emile0x1908");
  return NextResponse.json({ key: holds === true });
}
