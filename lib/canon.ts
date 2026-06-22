/**
 * Tier 1 Canon — locked system phrases.
 *
 * Use these instead of bespoke micro-copy. Each phrase has a specific
 * semantic role; using the wrong one dilutes the identity. The pillars
 * carry most of the weight; rare-use phrases stay rare on purpose.
 *
 * MAIN PILLARS (used everywhere — load-bearing identity)
 *   - 404 HEX NOT FOUND    master identity / brand
 *   - SIGNAL LOST          failure / network error / decay / offline
 *   - STRONG SIGNAL        approval / high rank / big bounty
 *   - SIGNAL RESTORED      comeback / resumption after cold
 *
 * SECONDARY SUPPORT (active states + confirmations)
 *   - SIGNAL ONLINE        active wallet / healthy meter
 *   - SIGNAL RECEIVED      understood / form submitted / claim confirmed
 *   - HEX RESTORED         mission success / hex credited
 *   - 404 RESOLVED         milestone / quest cleared / evolution
 *
 * RARE-USE SPECIAL (high-value moments only — overexposure kills cool)
 *   - HEX DETECTED         recognition / fresh-blood / first-find
 *   - SIGNAL FOUND         scanner discovery / wallet match
 *
 * Notes:
 *  - Don't use all 10 in the same view. One canon phrase per moment.
 *  - SECONDARY should appear ~3-4x more often than RARE.
 *  - Pillars carry the brand — never replace them with synonyms.
 */

export const CANON = {
  // Master identity / brand
  IDENTITY: "404 HEX NOT FOUND",

  // Main pillars
  LOST: "SIGNAL LOST",
  STRONG: "STRONG SIGNAL",
  RESTORED: "SIGNAL RESTORED",

  // Secondary
  ONLINE: "SIGNAL ONLINE",
  RECEIVED: "SIGNAL RECEIVED",
  HEX_RESTORED: "HEX RESTORED",
  RESOLVED: "404 RESOLVED",

  // Rare-use
  HEX_DETECTED: "HEX DETECTED",
  FOUND: "SIGNAL FOUND",
} as const;

export type CanonPhrase = (typeof CANON)[keyof typeof CANON];

/** Suggested status pill tone per canon phrase. Drives consistent coloring. */
export const CANON_TONE: Record<CanonPhrase, "gold" | "green" | "red" | "amber" | "ink"> = {
  "404 HEX NOT FOUND": "gold",
  "SIGNAL LOST":       "red",
  "STRONG SIGNAL":     "gold",
  "SIGNAL RESTORED":   "green",
  "SIGNAL ONLINE":     "green",
  "SIGNAL RECEIVED":   "ink",
  "HEX RESTORED":      "gold",
  "404 RESOLVED":      "gold",
  "HEX DETECTED":      "gold",
  "SIGNAL FOUND":      "green",
};

export const CANON_COLOR: Record<CanonPhrase, string> = {
  "404 HEX NOT FOUND": "var(--gold)",
  "SIGNAL LOST":       "#FF5A4D",
  "STRONG SIGNAL":     "var(--gold-bright)",
  "SIGNAL RESTORED":   "var(--state-active)",
  "SIGNAL ONLINE":     "var(--state-active)",
  "SIGNAL RECEIVED":   "var(--ink-2)",
  "HEX RESTORED":      "var(--gold)",
  "404 RESOLVED":      "var(--gold-bright)",
  "HEX DETECTED":      "var(--gold)",
  "SIGNAL FOUND":      "var(--state-active)",
};
