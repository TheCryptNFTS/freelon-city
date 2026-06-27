import { NextResponse } from "next/server";
import { getWalletBalanceVerified, isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";

/**
 * GET /api/wallet/[address]/balance
 *
 * Lightweight balance-only check. Unlike /tokens, this does NOT enumerate
 * every token ID — it's just the count via the two-source verified
 * lookup (RPC fallback + OpenSea). Used by the WalletConnect header
 * badge so it resolves in ~200ms instead of the multi-second cost of
 * /tokens for whales.
 *
 * Returns: { address, balance, verified, error? }
 *   - balance: number   (the count, or 0 if both sources agree zero)
 *   - verified: true    if at least one source resolved
 *   - balance: null + verified: false  if BOTH sources failed (caller
 *     should show "syncing/retry" UI, not "0 citizens")
 */
export const revalidate = 90;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const rl = await limit(req, "wallet:balance", { max: 90, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json(
      { address, balance: null, verified: false, error: "invalid_address" },
      { status: 400 },
    );
  }
  // ?nocache=1 forces a fresh RPC+OpenSea lookup. Used by the
  // WalletConnect "refresh" button so users can force a recount
  // after a transfer instead of waiting 90s for the cache to expire.
  const bypassCache = new URL(req.url).searchParams.get("nocache") === "1";
  const result = await getWalletBalanceVerified(address, { bypassCache });
  if (result === null) {
    return NextResponse.json(
      { address: address.toLowerCase(), balance: null, verified: false },
      { status: 200 },
    );
  }
  return NextResponse.json({
    address: address.toLowerCase(),
    balance: result,
    verified: true,
  });
}
