/**
 * Shared X daily write budget (2026-06-10 audit follow-up).
 *
 * Why: the poster fan-out (sales-pulse + CTA replies + sweep-burst +
 * weekly-receipts + daily-signal + agent-transmission + signal-report) can hit
 * ~20 tweets on a busy sales day. The X Free tier caps writes at ~17/24h
 * app-wide and 500/month, and overruns fail SILENTLY (best-effort posters).
 * This guard makes the ceiling explicit and spends it by priority instead of
 * first-come-first-served.
 *
 * Budget = X_DAILY_POST_BUDGET env, default 15 (safe for Free tier; set ~80 if
 * the app is on Basic). Priority classes:
 *   critical — the voice posts (daily-signal, agent-transmission,
 *              signal-report): blocked only when the WHOLE budget is spent
 *   standard — pulse/burst main tweets, weekly receipts: keeps 2 in reserve
 *   optional — pulse/burst CTA reply tweets: keeps 4 in reserve (these are
 *              the first to drop — they halve pulse volume for free)
 *
 * Fail-OPEN on Upstash trouble: X enforces the hard cap itself with 429s; the
 * guard exists to stop silent overruns, not to add a second failure point.
 */
import { upstash, hasUpstash } from "@/lib/upstash-client";

export type PostClass = "critical" | "standard" | "optional";
const RESERVE: Record<PostClass, number> = { critical: 0, standard: 2, optional: 4 };

function dailyBudget(): number {
  const n = parseInt(process.env.X_DAILY_POST_BUDGET || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 15;
}

/** Take one unit of today's (UTC) budget. True = the post may proceed. */
export async function takePostBudget(cls: PostClass): Promise<boolean> {
  if (!hasUpstash) return true;
  const day = new Date().toISOString().slice(0, 10);
  const key = `freelon:x:budget:${day}`;
  try {
    const n = Number(await upstash(["INCR", key]));
    if (n === 1) await upstash(["EXPIRE", key, "90000"]).catch(() => {});
    if (n <= dailyBudget() - RESERVE[cls]) return true;
    // Over this class's ceiling — return the unit so a higher class can use it.
    await upstash(["DECR", key]).catch(() => {});
    return false;
  } catch {
    return true;
  }
}
