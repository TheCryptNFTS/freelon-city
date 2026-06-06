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
  video: 60, // image-to-video (~$0.50 real) — rounded up hard
} as const;

/** Premium-run COGS estimates (cents) for the PREMIUM daily budget backstop. The
 *  premium (deep-model / image / video) runs are HEX-paid, but HEX is faucet-fed,
 *  so this pool bounds the founder's actual daily premium spend regardless of how
 *  much HEX a holder farmed or was granted. Override cap via AGENT_PREMIUM_BUDGET_USD. */
export const PREMIUM_COST_CENTS = {
  text: 5, // premium (deep) text run
  image: 6,
  video: 60,
} as const;

const DEFAULT_PREMIUM_BUDGET_USD = 100;
function premiumBudgetCents(): number {
  const usd = Number(process.env.AGENT_PREMIUM_BUDGET_USD);
  const dollars = Number.isFinite(usd) && usd > 0 ? usd : DEFAULT_PREMIUM_BUDGET_USD;
  return Math.round(dollars * 100);
}

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
async function consumeFrom(key: string, capCents: number, costCents: number): Promise<BudgetVerdict> {
  const charge = Math.max(1, Math.ceil(costCents));
  if (agentsKilled()) return { ok: false, reason: "killed", usedCents: 0, capCents };

  let used: number;
  if (hasUpstash) {
    try {
      used = Number(await upstash(["INCRBY", key, String(charge)]));
      // First write of the day → expire after 25h so it self-clears.
      if (used === charge) await upstash(["EXPIRE", key, String(25 * 60 * 60)]).catch(() => {});
    } catch {
      // Redis hiccup → fall back to the in-memory counter (per-instance cap) rather
      // than failing OPEN, so the dollar ceiling is never fully disabled. (M1 fix)
      used = (memCents.get(key) ?? 0) + charge;
      memCents.set(key, used);
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

async function refundTo(key: string, costCents: number): Promise<void> {
  const charge = Math.max(1, Math.ceil(costCents));
  if (hasUpstash) {
    await upstash(["INCRBY", key, String(-charge)]).catch(() => {});
    return;
  }
  memCents.set(key, Math.max(0, (memCents.get(key) ?? 0) - charge));
}

// FREE owner runs (cheap model). Own pool.
export const consumeFreeRun = (c: number = RUN_COST_CENTS.text) => consumeFrom(`freelon:budget:cents:${utcDay()}`, dailyBudgetCents(), c);
export const refundFreeRun = (c: number = RUN_COST_CENTS.text) => refundTo(`freelon:budget:cents:${utcDay()}`, c);

// PREMIUM (HEX-paid) runs — bounds the founder's daily premium COGS regardless of
// HEX supply (the "premium has no $ cap" leak from the economy red-team). (C1/C2 backstop)
export const consumePremiumRun = (c: number = PREMIUM_COST_CENTS.text) => consumeFrom(`freelon:budget:premium:${utcDay()}`, premiumBudgetCents(), c);
export const refundPremiumRun = (c: number = PREMIUM_COST_CENTS.text) => refundTo(`freelon:budget:premium:${utcDay()}`, c);
