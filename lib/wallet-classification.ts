/**
 * Wallet classification — pure function. Assigns one identity label
 * based on holdings, civ concentration, hex balance rank, and tier specials.
 *
 * Strongest match wins. Checked in priority order from most-rare to least.
 *
 * Inputs are passed in (no I/O); civ counts/honorary detection are computed
 * from `data/citizens.json` via `getCitizen(tokenId)`.
 */

import { getCitizen } from "@/lib/citizens";

export type WalletClass =
  | "SIGNAL WHALE"
  | "THE CULTIST"
  | "THE COLLECTOR"
  | "FLOOR DEFENDER"
  | "RELIC HUNTER"
  | "SIGNAL CARRIER"
  | "INITIATE"
  | "WITNESS";

export type ClassifyInput = {
  /** Number of citizens currently held */
  balance: number;
  /** Token IDs currently held */
  tokenIds: number[];
  /** Lifetime hex earned (across all kinds) */
  hexLifetime: number;
  /** 1-based rank by current hex balance (null if unknown) */
  hexBalanceRank?: number | null;
  /**
   * Earliest known acquisition timestamp (unix seconds) across held tokens.
   * Used as a proxy for the "30+ days held" check on FLOOR DEFENDER.
   * Optional; if omitted, the time check is skipped.
   */
  oldestHeldTs?: number | null;
};

const SECONDS_PER_DAY = 86400;

/** Build civ-count map and detect specials from tokenIds. Pure. */
function inspectHoldings(tokenIds: number[]): {
  civCounts: Map<string, number>;
  hasHonorary: boolean;
  hasOneOfOne: boolean;
  dominantPct: number;
  civCount: number;
} {
  const civCounts = new Map<string, number>();
  let hasHonorary = false;
  let hasOneOfOne = false;

  for (const tid of tokenIds) {
    const c = getCitizen(tid);
    if (!c) continue;
    civCounts.set(c.civilization, (civCounts.get(c.civilization) || 0) + 1);
    if (c.tier === "Honorary") hasHonorary = true;
    if (c.tier === "One of One") hasOneOfOne = true;
  }

  const total = tokenIds.length;
  let topCount = 0;
  for (const v of civCounts.values()) if (v > topCount) topCount = v;
  const dominantPct = total > 0 ? topCount / total : 0;

  return {
    civCounts,
    hasHonorary,
    hasOneOfOne,
    dominantPct,
    civCount: civCounts.size,
  };
}

export function classifyWallet(i: ClassifyInput): WalletClass {
  const { balance, tokenIds, hexBalanceRank, oldestHeldTs } = i;

  // Inspect held citizens once
  const { hasHonorary, hasOneOfOne, dominantPct, civCount } =
    inspectHoldings(tokenIds);

  // 1) SIGNAL WHALE — top 25 by hex balance (rare, highest priority)
  if (
    typeof hexBalanceRank === "number" &&
    hexBalanceRank > 0 &&
    hexBalanceRank <= 25
  ) {
    return "SIGNAL WHALE";
  }

  // 2) THE CULTIST — 90%+ in one civ + at least 5 citizens
  if (balance >= 5 && dominantPct >= 0.9) {
    return "THE CULTIST";
  }

  // 3) THE COLLECTOR — 10+ citizens across 5+ civs
  if (balance >= 10 && civCount >= 5) {
    return "THE COLLECTOR";
  }

  // 4) FLOOR DEFENDER — 5+ citizens held 30+ days
  if (balance >= 5 && typeof oldestHeldTs === "number" && oldestHeldTs > 0) {
    const ageDays = (Date.now() / 1000 - oldestHeldTs) / SECONDS_PER_DAY;
    if (ageDays >= 30) return "FLOOR DEFENDER";
  }

  // 5) RELIC HUNTER — owns at least 1 honorary OR 1-of-1
  if (hasHonorary || hasOneOfOne) {
    return "RELIC HUNTER";
  }

  // 6/7/8 — by raw balance
  if (balance >= 2) return "SIGNAL CARRIER";
  if (balance === 1) return "INITIATE";
  return "WITNESS";
}

export function classFlavor(c: WalletClass): string {
  switch (c) {
    case "SIGNAL WHALE":
      return "Top 25 by hex. The current moves with you.";
    case "THE CULTIST":
      return "One civ. One doctrine. No dilution.";
    case "THE COLLECTOR":
      return "Every civ accounted for. A walking census.";
    case "FLOOR DEFENDER":
      return "Held through the noise. Diamond in the static.";
    case "RELIC HUNTER":
      return "Carrier of named relics. Lore over volume.";
    case "SIGNAL CARRIER":
      return "Tuned in. Sustaining the broadcast.";
    case "INITIATE":
      return "First contact made. The signal recognizes you.";
    case "WITNESS":
      return "Outside the wall. The city sees you.";
  }
}
