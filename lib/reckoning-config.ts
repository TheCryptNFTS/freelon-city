/**
 * The Reckoning — config for the weekly civ-vs-civ tribute war.
 *
 * v1 = "Tribute War": every 7-day week, all ten civilizations compete for a
 * single weekly WAR SCORE. Anyone can burn real hex toward any civ; if the
 * burner holds citizens of that civ their burn is MUSTER-amplified (the token
 * is the game piece). At week's end the leading civ is crowned (glory only),
 * the result is archived, and a fresh week opens.
 *
 * Pure data + pure functions only. The store (lib/reckoning-store.ts) and the
 * routes own all I/O. The only hex movement is a DEBIT (a burn) handled in the
 * tribute route — this file mints nothing and never touches the hex ledger.
 *
 * ECONOMY ISOLATION (locked rule): the war chest is its own isolated tally.
 * Hex only ever flows OUT (burned). Nothing here sources real hex.
 */

import { ECONOMY } from "@/lib/economy-constants";

/** Schema/season tag. Bump to wipe all weeks and start a fresh war record. */
export const RECKONING_VERSION = 1;

/** Week 1 anchor — Monday 2026-05-25 00:00 UTC, the launch-era week. Weeks are
 *  fixed 7-day UTC windows from here. Do NOT move this retroactively or every
 *  archived week renumbers. */
export const RECKONING_GENESIS_UTC = Date.UTC(2026, 4, 25);
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 1-indexed week number for an instant. Week 1 = the genesis week. */
export function reckoningWeek(now: number = Date.now()): number {
  const delta = now - RECKONING_GENESIS_UTC;
  if (delta < 0) return 1;
  return Math.floor(delta / WEEK_MS) + 1;
}

/** UTC start instant of a given 1-indexed week. */
export function weekStartTs(week: number): number {
  return RECKONING_GENESIS_UTC + (week - 1) * WEEK_MS;
}

/** UTC end instant (exclusive) of a given 1-indexed week. */
export function weekEndTs(week: number): number {
  return weekStartTs(week) + WEEK_MS;
}

/** Minimum tribute, in hex. Reuses the audited tithe floor so the two sinks
 *  share one mental model. */
export const RECKONING_MIN_TRIBUTE = ECONOMY.TITHE_MIN;

/**
 * Muster amplification: holding citizens of the civ you tribute to makes your
 * burn count for MORE toward that civ's war score (the token is the game
 * piece). +2% per held citizen of that civ, capped at +100% (2x). A non-holder
 * tributes at exactly 1x, so the war stays open to everyone (top-of-funnel).
 *
 * This only scales the ISOLATED war score. The real hex DEBIT is always the
 * raw amount the player chose — muster never changes how much hex is burned,
 * only how loudly it lands in the war. So it can never be an economic exploit.
 */
export const MUSTER_PER_CITIZEN = 0.02;
export const MUSTER_CAP = 1.0; // max +100% → 2x

export function musterMultiplier(heldOfCiv: number): number {
  if (heldOfCiv <= 0) return 1;
  return 1 + Math.min(heldOfCiv * MUSTER_PER_CITIZEN, MUSTER_CAP);
}

/**
 * Anti-whale war-score curve.
 *
 * War points are LINEAR in raw hex up to a per-wallet, per-civ soft cap; beyond
 * it, additional hex from the SAME wallet to the SAME civ yields concave
 * (sqrt-damped) points. This is what lets a coalition of many smaller backers
 * out-score a lone whale, instead of the war being a pure wallet-size check.
 *
 * Crucially it keys on the wallet's CUMULATIVE raw hex to a civ this week — not
 * on the size of a single tribute — so splitting one big burn into many small
 * ones doesn't dodge the damping. The hex DEBIT is always the raw amount the
 * player chose (handled in the route); this only scales the isolated war score,
 * so it can never be an economic exploit.
 */
export const RECKONING_SOFTCAP = 500;

/** Concave cumulative war points for a wallet's total raw hex to one civ.
 *  Linear ≤ softcap, then sqrt-damped with slope continuous at the knee
 *  (slope 1 exactly at the cap, decaying toward 0 as the total grows). */
export function warCurve(rawCumulative: number): number {
  const S = RECKONING_SOFTCAP;
  if (rawCumulative <= S) return Math.max(0, rawCumulative);
  return S + 2 * S * (Math.sqrt(1 + (rawCumulative - S) / S) - 1);
}

/**
 * Muster-amplified war points earned by adding `addRaw` hex on top of a
 * wallet's existing `prevRaw` cumulative to this civ. The marginal slice of the
 * concave curve, then scaled by muster. Integer so the ledger stays clean.
 */
export function warPointsMarginal(
  prevRaw: number,
  addRaw: number,
  heldOfCiv: number,
): number {
  const marginal = warCurve(prevRaw + addRaw) - warCurve(prevRaw);
  return Math.max(0, Math.floor(marginal * musterMultiplier(heldOfCiv)));
}
