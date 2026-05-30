/**
 * Shared daily-challenge primitives for the arcade games.
 *
 * Proof of Signal proved out the "one puzzle a day + a streak you don't want to
 * break" retention loop; this lib lets Hex Match and Sweep Run reuse the same
 * spine: a stable per-UTC-day number/key, a deterministic seeded PRNG so every
 * player faces the identical daily setup, and a streak resolver.
 *
 * Everything is PURE + deterministic (no Math.random, no Date side effects
 * beyond the `now` you pass) so the daily is fair and the same on every device.
 */

/** Day 1 = 2026-05-28 UTC, the same genesis Proof of Signal anchors to, so the
 *  whole arcade shares one "Day N". Do NOT move this. */
const GENESIS_UTC = Date.UTC(2026, 4, 28);

function utcMidnight(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** Human-facing day number (Day 1 at genesis). */
export function dayNumber(now: Date = new Date()): number {
  return Math.floor((utcMidnight(now) - GENESIS_UTC) / 86_400_000) + 1;
}

/** Stable per-UTC-day key (YYYY-MM-DD) for localStorage / dedupe. */
export function dayKey(now: Date = new Date()): string {
  return new Date(utcMidnight(now)).toISOString().slice(0, 10);
}

/** Yesterday's key — used to decide whether a streak continues. */
export function yesterdayKey(now: Date = new Date()): string {
  return dayKey(new Date(utcMidnight(now) - 86_400_000));
}

/** mulberry32 — tiny, fast, deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A seeded RNG for a given day. `salt` lets two games on the same day get
 * independent (but each deterministic) streams — e.g. dailyRng(d, "hex").
 */
export function dailyRng(day: number, salt = ""): () => number {
  let h = 0x9e3779b9 ^ Math.imul(day, 2654435761);
  for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 2654435761);
  return mulberry32(h >>> 0);
}

export type StreakState = { streak: number; lastDayKey: string };

/**
 * Resolve a streak given the prior state and the outcome of today's daily.
 *  - a loss (or not completing) resets to 0
 *  - a win continues the streak iff the previous win was *yesterday*, else 1
 * Pure: pass `now` for testability.
 */
export function resolveStreak(
  prev: StreakState | null,
  won: boolean,
  now: Date = new Date(),
): StreakState {
  const today = dayKey(now);
  if (!won) return { streak: 0, lastDayKey: today };
  const continues = prev != null && prev.lastDayKey === yesterdayKey(now);
  return { streak: continues ? prev!.streak + 1 : 1, lastDayKey: today };
}
