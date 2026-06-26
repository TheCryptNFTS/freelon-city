/**
 * COLLAPSE MODE — neutralized.
 *
 * This layer used to throttle earnings and discount sinks when the
 * SECONDARY ETH FLOOR fell. That coupled the in-app economy to the
 * secondary market price — exactly the "your floor drives the machine"
 * trap we refuse to build. It has been disabled: getCollapseState()
 * now always reports healthy (identity ×1, no discount), so nothing in
 * the app reacts to the floor.
 *
 * The type + helpers are kept so the many call sites
 * (applyEarnMultiplier / applySinkMultiplier / CollapseBanner) keep
 * working unchanged — they all short-circuit to identity when inactive.
 * If a future dynamic-difficulty layer is wanted, drive it from an
 * IN-APP activity signal, never from the sale price.
 */

export type CollapseState = {
  active: boolean;
  /** ETH floor at last read. Always 0 now — no longer read. */
  floor: number;
  /** 24h hex-index change in percent. Always null now. */
  change24h: number | null;
  /** Multiplier applied to active-earning hex. Always 1. */
  earnMultiplier: number;
  /** Multiplier applied to sink costs. Always 1. */
  sinkMultiplier: number;
  /** Human-readable banner copy when active. Always empty. */
  banner: string;
};

const HEALTHY: CollapseState = {
  active: false,
  floor: 0,
  change24h: null,
  earnMultiplier: 1,
  sinkMultiplier: 1,
  banner: "",
};

/**
 * Return the current collapse state. Always healthy — the economy no
 * longer reacts to the secondary price. Safe to call from any server
 * route; never throws, never fetches.
 */
export async function getCollapseState(): Promise<CollapseState> {
  return HEALTHY;
}

/**
 * Convenience: apply the earn multiplier to a number, floored to
 * an integer (hex amounts are always whole numbers).
 */
export function applyEarnMultiplier(hex: number, state: CollapseState): number {
  if (!state.active || state.earnMultiplier === 1) return hex;
  return Math.max(0, Math.floor(hex * state.earnMultiplier));
}

/**
 * Convenience: apply the sink discount to a cost. Floored to integer
 * for consistency with the credit/debit ledger (hex is always whole).
 */
export function applySinkMultiplier(cost: number, state: CollapseState): number {
  if (!state.active || state.sinkMultiplier === 1) return cost;
  return Math.max(1, Math.floor(cost * state.sinkMultiplier));
}
