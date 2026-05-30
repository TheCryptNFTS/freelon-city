/**
 * Proof of Signal — the daily, no-wallet, deterministic puzzle ("the Wordle of
 * FREELON CITY"). Every UTC day the city broadcasts one hidden frequency: an
 * ordered sequence of signals drawn from the ten civilization doctrines. Tune
 * to it in PROOF_MAX_ATTEMPTS guesses to prove you can still receive the city.
 *
 * Everything here is PURE + deterministic so every player on a given UTC day
 * faces the identical code — that's what makes results comparable and the
 * spoiler-free share grid meaningful. No economy, no wallet, no server: this is
 * top-of-funnel acquisition only, computed entirely client-side (the answer
 * being derivable is fine, same as Wordle).
 */

import { CIVILIZATIONS, type CivilizationSlug } from "@/lib/constants";

export const PROOF_CODE_LEN = 5;
export const PROOF_MAX_ATTEMPTS = 6;

/** The ten signals, in canonical CIVILIZATIONS order. Repeats are allowed in a
 *  code, so a 5-long frequency has 10^5 possibilities. */
export const SIGNALS = Object.keys(CIVILIZATIONS) as CivilizationSlug[];

/** Day 1 = launch day, 2026-05-28 UTC. Stable forever — do NOT move this, the
 *  whole daily-number sequence is anchored to it. */
const GENESIS_UTC = Date.UTC(2026, 4, 28); // month is 0-indexed → 4 = May

function utcMidnight(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** Human-facing day number (Day 1 at genesis). */
export function proofDayNumber(now: Date = new Date()): number {
  return Math.floor((utcMidnight(now) - GENESIS_UTC) / 86_400_000) + 1;
}

/** Stable per-UTC-day key (YYYY-MM-DD) for localStorage / dedupe. */
export function proofDayKey(now: Date = new Date()): string {
  return new Date(utcMidnight(now)).toISOString().slice(0, 10);
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

/** The hidden frequency for a day — deterministic, identical for everyone. */
export function proofCode(day: number = proofDayNumber()): CivilizationSlug[] {
  const rng = mulberry32((0x9e3779b9 ^ Math.imul(day, 2654435761)) >>> 0);
  const code: CivilizationSlug[] = [];
  for (let i = 0; i < PROOF_CODE_LEN; i++) {
    code.push(SIGNALS[Math.floor(rng() * SIGNALS.length)]);
  }
  return code;
}

export type Peg = "locked" | "carrier" | "dead";

/**
 * Mastermind scoring. Two-pass so a repeated signal is credited at most as
 * often as it occurs in the code:
 *   locked  — right signal, right slot
 *   carrier — right signal, wrong slot (present elsewhere, not yet consumed)
 *   dead    — signal not (or no longer) in the code
 */
export function scoreGuess(guess: string[], code: string[]): Peg[] {
  const res: Peg[] = new Array(guess.length).fill("dead");
  const remaining: Record<string, number> = {};
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) res[i] = "locked";
    else remaining[code[i]] = (remaining[code[i]] || 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === "locked") continue;
    const g = guess[i];
    if (remaining[g] > 0) {
      res[i] = "carrier";
      remaining[g]--;
    }
  }
  return res;
}

/** True once every slot is locked. */
export function isSolved(pegs: Peg[]): boolean {
  return pegs.length > 0 && pegs.every((p) => p === "locked");
}

/** Spoiler-free emoji used in the shareable result grid (one per slot). Gold =
 *  locked, blue = carrier, black = dead — recognisable at a glance like Wordle. */
export const PEG_EMOJI: Record<Peg, string> = {
  locked: "\u{1F7E1}", // 🟡
  carrier: "\u{1F535}", // 🔵
  dead: "\u2B1B", // ⬛
};

/** Render a guess history into the spoiler-free share grid. */
export function shareGrid(rows: Peg[][]): string {
  return rows.map((r) => r.map((p) => PEG_EMOJI[p]).join("")).join("\n");
}
