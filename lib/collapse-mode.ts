/**
 * COLLAPSE MODE — dynamic-difficulty layer.
 *
 * Reads the floor + hex-index history maintained by /api/hex-index.
 * When the city is in measurable collapse, returns multipliers and
 * sink discounts that the rest of the app respects. When the city is
 * healthy, returns identity (×1, no discount).
 *
 * Trigger: floor < COLLAPSE_FLOOR_THRESHOLD ETH for at least 1
 * snapshot (24h cadence) AND most-recent 24h hex-index change ≤
 * COLLAPSE_CHANGE_THRESHOLD_24H.
 *
 * Effects (active simultaneously when triggered):
 *   - Earnings brownout: every active-earning route applies a 0.5×
 *     multiplier to the hex paid. Floor-tied throttling.
 *   - Tithe discount: NAMING / REALIGN / TITHE / FEATURE costs all
 *     drop to a fraction (default 0.4×) so balances actually burn.
 *   - Dump-burn escalation: dumper burn rate + cap rise, rescuer
 *     bounty rises. Already-soft floor gets harder to push lower.
 *
 * Surface: lib/collapse-mode.getCollapseState() is the one entry point.
 * Cached in memory for 60s to avoid hammering the hex-index endpoint
 * on every read. Failure → "not collapsing" (fail-open: when in doubt,
 * don't throttle real users).
 */

export type CollapseState = {
  active: boolean;
  /** ETH floor at last read. */
  floor: number;
  /** 24h hex-index change in percent. null if history insufficient. */
  change24h: number | null;
  /** Multiplier applied to active-earning hex (e.g. 0.5 during collapse). */
  earnMultiplier: number;
  /** Multiplier applied to sink costs (NAMING, REALIGN, TITHE…) (e.g. 0.4). */
  sinkMultiplier: number;
  /** Multiplier on dumper burn amounts. */
  dumpBurnMultiplier: number;
  /** Multiplier on rescuer bounty. */
  rescueBountyMultiplier: number;
  /** Human-readable banner copy when active. */
  banner: string;
};

const HEALTHY: CollapseState = {
  active: false,
  floor: 0,
  change24h: null,
  earnMultiplier: 1,
  sinkMultiplier: 1,
  dumpBurnMultiplier: 1,
  rescueBountyMultiplier: 1,
  banner: "",
};

// Trigger thresholds. Tune these as conditions evolve. Conservative
// defaults — too aggressive and we punish carriers during normal
// price fluctuation.
const COLLAPSE_FLOOR_THRESHOLD = 0.005;       // ETH
const COLLAPSE_CHANGE_THRESHOLD_24H = -10;    // percent (must be ≤ this to trigger)
const EARN_MULTIPLIER = 0.5;
const SINK_MULTIPLIER = 0.4;
const DUMP_BURN_MULTIPLIER = 4;
const RESCUE_BOUNTY_MULTIPLIER = 3;
const CACHE_MS = 60_000;

let cached: { state: CollapseState; ts: number } | null = null;

async function readIndex(): Promise<{ floor: number; change24h: number | null } | null> {
  // Server-side: call our own hex-index endpoint. Caches 5 min on
  // its end, so this is cheap.
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const r = await fetch(`${base}/api/hex-index`, { cache: "no-store" });
    if (!r.ok) return null;
    const d = (await r.json()) as { floor?: number; change24h?: number | null };
    return {
      floor: Number(d.floor || 0),
      change24h: d.change24h == null ? null : Number(d.change24h),
    };
  } catch {
    return null;
  }
}

/**
 * Return the current collapse state. Cached for 60s. Safe to call from
 * any server route — never throws.
 */
export async function getCollapseState(): Promise<CollapseState> {
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.state;
  const idx = await readIndex();
  if (!idx) {
    // Fail open
    cached = { state: HEALTHY, ts: Date.now() };
    return HEALTHY;
  }
  const floorOk = idx.floor > 0 && idx.floor < COLLAPSE_FLOOR_THRESHOLD;
  const changeOk = idx.change24h != null && idx.change24h <= COLLAPSE_CHANGE_THRESHOLD_24H;
  const active = floorOk && changeOk;
  const state: CollapseState = active
    ? {
        active: true,
        floor: idx.floor,
        change24h: idx.change24h,
        earnMultiplier: EARN_MULTIPLIER,
        sinkMultiplier: SINK_MULTIPLIER,
        dumpBurnMultiplier: DUMP_BURN_MULTIPLIER,
        rescueBountyMultiplier: RESCUE_BOUNTY_MULTIPLIER,
        banner: `⚠ THE GRID IS DIMMING · earning ${Math.round((1 - EARN_MULTIPLIER) * 100)}% reduced · burns ${Math.round((1 - SINK_MULTIPLIER) * 100)}% off · defenders, hold the line`,
      }
    : {
        ...HEALTHY,
        floor: idx.floor,
        change24h: idx.change24h,
      };
  cached = { state, ts: Date.now() };
  return state;
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
