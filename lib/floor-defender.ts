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


export type DefenderResult = {
  qualifyingTokens: number;
  hexCredited: number;
  daysCredited: number;
};

export async function runFloorDefenderTick(address: string): Promise<DefenderResult> {
  // Retired TRUE no-op. Previously stamped lastDefenderTickDay under the wallet
  // lock, costing a Redis GET+SET on every authenticated /hex call for credit that
  // is ALWAYS zero. Dropped that write entirely; the function + return stub remain
  // only for type/call-site compatibility. `address` is intentionally unused.
  void address;
  return { qualifyingTokens: 0, hexCredited: 0, daysCredited: 0 };
}
