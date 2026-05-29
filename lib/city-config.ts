/**
 * Shared-city config — "Restore the Signal" v2 (one global city).
 *
 * Unlike the old per-browser localStorage prototype, the city is a single
 * server-authoritative world (see lib/city-store.ts). This file holds the pure
 * data the server and client agree on: the ten relight milestones, the
 * caste-gated structure catalog, the cost curve, and the real-hex boost rate.
 *
 * SEASONS: the schema carries a `season` number everywhere so a future reset
 * just bumps CITY_SEASON and starts a fresh global record. v1 is season 1, a
 * one-time relight event. Do NOT renumber retroactively.
 */

import type { CasteName } from "@/lib/constants";

export const CITY_SEASON = 1;

/** Lazy-accrual cap: a single collect credits at most this many seconds of
 *  generation, so an idle/offline gap is a nudge, never a jackpot, and a
 *  spoofed/long gap can't dump unbounded signal. Server clock is canonical. */
export const ACCRUAL_CAP_SEC = 12 * 3600;

/** One-time starting grant on a wallet's first collect, so a brand-new player
 *  (0 structures → 0 rate) can afford their first Signal Nodes and bootstrap
 *  the accrual loop. Enough for a few base nodes; not enough to skip the climb. */
export const STARTING_SIGNAL = 30;

/** Real-hex boost: 1 burned hex → this much city signal (credited to the
 *  burner's contribution + the global total + their spendable balance).
 *  This is a SINK on the live hex economy — it only ever debits real hex,
 *  never mints it. */
export const BOOST_RATE = 50;
export const MIN_BOOST_HEX = 10;

/** Holder multiplier: +5% city output per citizen held, capped at +200% (3x).
 *  Mirrors the original prototype so the feel is unchanged. */
export function holderMultiplier(balance: number): number {
  if (balance <= 0) return 1;
  return 1 + Math.min(balance * 0.05, 2);
}

/** THE FULL SIGNAL set bonus — rewards holding across the connected
 *  collections (see lib/signal-set.ts). This multiplies CITY SIGNAL output
 *  only; it never touches the real hex ledger, so it stays inside the
 *  economy-isolation rule. Fail-safe: an unknown/unscanned wallet defaults
 *  to 0 tiers → 1.0x, so a failed lookup can never over-credit. */
export const SET_BONUS_PER_TIER = 0.04; // +4% per collection held beyond the first
export const FULL_SET_BONUS = 0.3; // +30% flat when the whole set is held
export const FULL_SET_TIERS = 6; // = CONNECTED_COLLECTIONS.length — keep in sync
export function setMultiplier(tiersHeld: number): number {
  if (tiersHeld <= 1) return 1; // a single collection earns no breadth bonus
  const stacked = (tiersHeld - 1) * SET_BONUS_PER_TIER;
  const full = tiersHeld >= FULL_SET_TIERS ? FULL_SET_BONUS : 0;
  return 1 + stacked + full;
}

/** Companion bonus — OOGIES are the listeners tuned to the hex; each one
 *  amplifies a wallet's city output. This is a DEPTH bonus (more OOGIES =
 *  more amplification), distinct from setMultiplier's breadth bonus, and they
 *  stack. City signal only — never touches the hex ledger. The OOGIE count is
 *  read from the same set scan that feeds setMultiplier, so it adds no extra
 *  network cost. Fail-safe: 0 companions → 1.0x. */
export const COMPANION_BONUS_PER = 0.03; // +3% city output per OOGIE held
export const COMPANION_BONUS_CAP = 0.6; // capped at +60% (~20 OOGIES)
export function companionMultiplier(oogieCount: number): number {
  if (oogieCount <= 0) return 1;
  return 1 + Math.min(oogieCount * COMPANION_BONUS_PER, COMPANION_BONUS_CAP);
}

/** Reclaim bonus — The Crypt holds the city's DEAD SIGNALS. Each one a holder
 *  keeps is a corrupted node fed back into the grid, so it lifts city output.
 *  A DEPTH bonus like the OOGIE companion bonus (more = more), distinct axis,
 *  and they stack. Read from the SAME set scan that feeds setMultiplier — no
 *  extra network cost. City signal only — never the hex ledger. NO BURN: this
 *  rewards merely HOLDING The Crypt, it consumes nothing. Fail-safe: 0 → 1.0x. */
export const RECLAIM_BONUS_PER = 0.01; // +1% city output per Crypt token held
export const RECLAIM_BONUS_CAP = 0.1; // capped at +10% (The Crypt is the most common collection, so the bonus is deliberately small)
export function reclaimMultiplier(cryptCount: number): number {
  if (cryptCount <= 0) return 1;
  return 1 + Math.min(cryptCount * RECLAIM_BONUS_PER, RECLAIM_BONUS_CAP);
}

/** The ten civilizations relight at these cumulative GLOBAL-signal milestones.
 *  Tuned for a shared city: far higher than the solo prototype because the
 *  whole community contributes to one bar. Colors mirror lib/constants. */
export const CITY_CIVS = [
  { slug: "blue-synthesis", name: "Blue Synthesis", at: 0, color: "#00B8FF" },
  { slug: "red-corruption", name: "Red Corruption", at: 25_000, color: "#FF3A2D" },
  { slug: "green-growth", name: "Green Growth", at: 120_000, color: "#4CFF7A" },
  { slug: "purple-oracle", name: "Purple Oracle", at: 500_000, color: "#B85CFF" },
  { slug: "white-transmission", name: "White Transmission", at: 1_800_000, color: "#E8F4FF" },
  { slug: "pink-luxury", name: "Pink Luxury", at: 6_000_000, color: "#FF5CB4" },
  { slug: "black-fracture", name: "Black Fracture", at: 18_000_000, color: "#9A9AA5" },
  { slug: "gold-sovereignty", name: "Gold Sovereignty", at: 52_000_000, color: "#FFD24A" },
  { slug: "void-404", name: "Void 404", at: 150_000_000, color: "#8A5DFF" },
  { slug: "silver-machine", name: "Silver Machine", at: 404_000_000, color: "#C9D2DE" },
] as const;

export type StructureKey =
  | "node"
  | "receiver"
  | "relay"
  | "array"
  | "forge"
  | "bastion"
  | "core"
  | "throne";

export type Structure = {
  key: StructureKey;
  name: string;
  desc: string;
  /** Caste required to build it. null = open to everyone (the acquisition ramp). */
  caste: CasteName | null;
  baseCost: number;
  rate: number; // signal/sec each, before holder multiplier
  accent: string; // CSS var or hex, passed straight to the client
};

/**
 * Caste-gated catalog. Rarer castes unlock stronger structures — so holding a
 * rare caste is mechanically valuable, which is the whole point: the token IS
 * the game piece. The base Signal Node is open to all (non-holders included)
 * so the city is still playable on "borrowed signal".
 *
 * Counts (from CASTES): SIGNAL BORN 1677 · DUST RUNNER 1140 · CHOIR 824 ·
 * ARCHITECT 150 · VOID KNIGHT 142 · SYNTH ASCENDED 66 · THE THRONE 41.
 */
export const STRUCTURES: Structure[] = [
  {
    key: "node",
    name: "Signal Node",
    desc: "A citizen comes back online. Anyone can raise one.",
    caste: null,
    baseCost: 10,
    rate: 0.2,
    accent: "var(--neon-cyan)",
  },
  {
    key: "receiver",
    name: "Receiver Choir",
    desc: "Signal Born tune the open band.",
    caste: "SIGNAL BORN",
    baseCost: 120,
    rate: 2,
    accent: "#00B8FF",
  },
  {
    key: "relay",
    name: "Dust Relay",
    desc: "Dust Runners carry signal across the outer city.",
    caste: "DUST RUNNER",
    baseCost: 320,
    rate: 5,
    accent: "#4CFF7A",
  },
  {
    key: "array",
    name: "Static Array",
    desc: "The Choir of Static turns corruption into carrier.",
    caste: "CHOIR OF STATIC",
    baseCost: 900,
    rate: 14,
    accent: "#FF3A2D",
  },
  {
    key: "forge",
    name: "Architect Forge",
    desc: "Architects build the transmission spine.",
    caste: "ARCHITECT",
    baseCost: 4_000,
    rate: 70,
    accent: "#B85CFF",
  },
  {
    key: "bastion",
    name: "Void Bastion",
    desc: "Void Knights hold the relit grid.",
    caste: "VOID KNIGHT",
    baseCost: 9_000,
    rate: 160,
    accent: "#8A5DFF",
  },
  {
    key: "core",
    name: "Synth Core",
    desc: "Synth Ascended compute pure signal.",
    caste: "SYNTH ASCENDED",
    baseCost: 30_000,
    rate: 600,
    accent: "#C9D2DE",
  },
  {
    key: "throne",
    name: "Throne Antenna",
    desc: "The Throne decrees the city back to light.",
    caste: "THE THRONE",
    baseCost: 90_000,
    rate: 2_000,
    accent: "#FFD24A",
  },
];

export const STRUCTURE_BY_KEY: Record<string, Structure> = Object.fromEntries(
  STRUCTURES.map((s) => [s.key, s]),
);

/** Classic 1.15x incremental cost curve, per wallet per structure owned. */
export function costOf(s: Structure, owned: number): number {
  return Math.ceil(s.baseCost * Math.pow(1.15, owned));
}

/** Sum a structure map into signal/sec, before the holder multiplier. */
export function baseRate(structures: Record<string, number>): number {
  let r = 0;
  for (const s of STRUCTURES) r += (structures[s.key] || 0) * s.rate;
  return r;
}

/** How many of the ten civilizations are lit at a given global total. */
export function civsLitAt(total: number): number {
  let n = 0;
  for (const c of CITY_CIVS) if (total >= c.at) n++;
  return n;
}
