/**
 * Cost guardrails for the FREE internal test phase. While missions are free,
 * every run spends real money (LLM tokens + image generation) out of OUR
 * account. Two bounds protect the wallet:
 *
 *   1. KILL-SWITCH (env) — flip agents off instantly without a deploy. Set
 *      AGENT_AGENTS_OFF=1 (or "off") and every free run is refused with a
 *      friendly "offline" message. Checked BEFORE any payment prompt so a paid
 *      holder is never told to pay while the engine is down.
 *
 *   2. GLOBAL DAILY $ BUDGET — a collection-wide DOLLAR ceiling on free spend
 *      per UTC day (AGENT_DAILY_BUDGET_USD, default $20). Each free run charges
 *      its estimated cost (cheap text ~1¢, an image ~5¢) against the day's pool,
 *      counted atomically in Redis as cents. Once the pool is spent, free runs
 *      return "daily capacity reached, back tomorrow". Paid (verified) runs are
 *      NOT capped — the holder covered the cost.
 *
 * Charging in CENTS (not a flat run count) means an image can't blow the budget
 * 25× faster than text while counting the same. Estimates are rounded UP, so
 * actual spend always lands at or under the configured ceiling.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

/** Default daily dollar ceiling for FREE runs. Override with AGENT_DAILY_BUDGET_USD. */
const DEFAULT_BUDGET_USD = 20;

/** Conservative per-run cost estimates in CENTS (rounded up for safety). */
export const RUN_COST_CENTS = {
  text: 1, // cheap-model mission (~0.2¢ real) — rounded up hard
  image: 5, // gpt-image-1.5 medium 1024² (~4.65¢ real)
} as const;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when the kill-switch env is engaged (agents disabled). */
export function agentsKilled(): boolean {
  const v = (process.env.AGENT_AGENTS_OFF ?? "").trim().toLowerCase();
  return v === "1" || v === "off" || v === "true";
}

/** The day's free-spend ceiling, in CENTS. */
function dailyBudgetCents(): number {
  const usd = Number(process.env.AGENT_DAILY_BUDGET_USD);
  const dollars = Number.isFinite(usd) && usd > 0 ? usd : DEFAULT_BUDGET_USD;
  return Math.round(dollars * 100);
}

/**
 * How many times ONE citizen may run ONE free mission per UTC day. Strict
 * default is 1 (the unfakeable-résumé pace). During the free quality-test you
 * can flip AGENT_TEST_RAMP=1 to let citizens specialize faster — each run is
 * still a REAL mission granting exactly +1 skill, so the track-record stays
 * truthful; only the daily throttle is relaxed. The global $ budget still
 * bounds total spend, so the ramp can't blow the budget. Turn it OFF before
 * payments go live to restore the strict pace.
 */
export function runsPerCitizenPerDay(): number {
  const on = (process.env.AGENT_TEST_RAMP ?? "").trim().toLowerCase();
  if (!(on === "1" || on === "true" || on === "on")) return 1;
  const n = Number(process.env.AGENT_TEST_RUNS_PER_DAY);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 25;
}

export type BudgetVerdict =
  | { ok: true; usedCents: number; capCents: number }
  | { ok: false; reason: "killed" | "cap"; usedCents: number; capCents: number };

// In-memory fallback counter (dev / Upstash down) — cents spent, keyed by UTC day.
const memCents = new Map<string, number>();

/**
 * Atomically charge `costCents` against the day's free-spend budget. Returns
 * ok:false if the kill-switch is on or the charge would exceed the ceiling (no
 * cents consumed in those cases). On success the day's tally has advanced.
 */
export async function consumeFreeRun(costCents: number = RUN_COST_CENTS.text): Promise<BudgetVerdict> {
  const capCents = dailyBudgetCents();
  const charge = Math.max(1, Math.ceil(costCents));
  if (agentsKilled()) return { ok: false, reason: "killed", usedCents: 0, capCents };

  const key = `freelon:budget:cents:${utcDay()}`;
  let used: number;
  if (hasUpstash) {
    try {
      used = Number(await upstash(["INCRBY", key, String(charge)]));
      // First write of the day → expire after 25h so it self-clears.
      if (used === charge) await upstash(["EXPIRE", key, String(25 * 60 * 60)]).catch(() => {});
    } catch {
      // Redis hiccup → fail OPEN (don't block holders on infra), but don't count.
      return { ok: true, usedCents: 0, capCents };
    }
  } else {
    used = (memCents.get(key) ?? 0) + charge;
    memCents.set(key, used);
  }

  if (used > capCents) {
    // Over budget — give the charge back so the tally doesn't run away, and refuse.
    if (hasUpstash) await upstash(["INCRBY", key, String(-charge)]).catch(() => {});
    else memCents.set(key, Math.max(0, used - charge));
    return { ok: false, reason: "cap", usedCents: used - charge, capCents };
  }
  return { ok: true, usedCents: used, capCents };
}

/** Give back a charge when a free run failed to produce output. */
export async function refundFreeRun(costCents: number = RUN_COST_CENTS.text): Promise<void> {
  const charge = Math.max(1, Math.ceil(costCents));
  const key = `freelon:budget:cents:${utcDay()}`;
  if (hasUpstash) {
    await upstash(["INCRBY", key, String(-charge)]).catch(() => {});
    return;
  }
  memCents.set(key, Math.max(0, (memCents.get(key) ?? 0) - charge));
}
