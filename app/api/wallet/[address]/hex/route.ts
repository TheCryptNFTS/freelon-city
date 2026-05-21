import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/wallet-tokens";
import { runHolderTick } from "@/lib/holder-tick";
import { getWalletHex } from "@/lib/wallet-hex-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

  // Run the holder tick (catches up since last day, caps at 30d)
  const tick = await runHolderTick(address);
  const rec = await getWalletHex(address);

  return NextResponse.json({
    address: rec.address,
    balance: rec.balance,
    lifetimeEarned: rec.lifetimeEarned,
    lastHolderTickDay: rec.lastHolderTickDay,
    tick,
    events: rec.events.slice(0, 20),
  });
}
