/**
 * Floor defender — RETIRED.
 *
 * Previously awarded 50 hex/day per citizen held continuously for 30+ days.
 * Was the dominant passive farm for whales. Removed in favour of the
 * active-action economy (snipe / sale-share / sweep / list bounty).
 *
 * The function is preserved as a no-op so callers (API routes, UIs) don't
 * need updating. It stamps the cursor day and returns zero credit. Existing
 * hex accrued under the old rule stays in user balances — nothing is
 * clawed back.
 */

import { patchWalletHex, todayUTC } from "@/lib/wallet-hex-store";

export type DefenderResult = {
  qualifyingTokens: number;
  hexCredited: number;
  daysCredited: number;
};

export async function runFloorDefenderTick(address: string): Promise<DefenderResult> {
  // Retired no-op. Stamp the cursor UNDER the wallet lock so it never clobbers a
  // concurrent sweep/sale credit with a stale full-record write (upgrade audit #8).
  await patchWalletHex(address, (r) => { r.lastDefenderTickDay = todayUTC(); });
  return { qualifyingTokens: 0, hexCredited: 0, daysCredited: 0 };
}
