/**
 * Canonical economy constants for FREELON CITY.
 *
 * Every hex earning / burn amount referenced by the app should derive from
 * this file. If a number lives in code, it MUST be imported from here. If
 * a number is shown in display copy (/earn, marketing pages), the value
 * must match these constants or the source-of-truth wins.
 *
 * Source-of-truth precedence: economy-constants.ts > code site > display.
 *
 * When adding a new earning rule, add the constant here FIRST, then import
 * it where it's used.
 */

export const ECONOMY = {
  // ─── Hex / ETH peg ──────────────────────────────────────────────────
  // All ETH↔hex conversions (sale share, snipe bounty) use this peg.
  // 100k hex ≈ 1 ETH, so 1 hex ≈ $0.035 at ETH=$3.5k.
  HEX_PER_ETH: 100_000,

  // ─── PASSIVE (deliberately tiny — see ACTIVE for the real income) ──
  // Passive baseline kept as a small floor so the meter has a pulse.
  // Active actions earn 10-100x more.
  PER_CITIZEN_PER_DAY: 0.1,          // was 1 — 10x nerf
  ONE_OF_ONE_BONUS_PER_DAY: 20,      // was 200 — symbolic flex, not a farm
  HONORARY_BONUS_PER_WEEK: 50,
  MAX_CATCHUP_DAYS: 30,

  // ─── DECAY GATE ─────────────────────────────────────────────────────
  // If a wallet performs no active action (claim/sweep/snipe/sale) in
  // this many days, passive earnings PAUSE until they next claim.
  ACTIVITY_DECAY_DAYS: 14,
  // On resume after a pause, credit at most this many days retroactive.
  ACTIVITY_RESUME_BACKFILL_DAYS: 3,

  // ─── Sweep bounty (lib/sweep-inline.ts) ─────────────────────────────
  SWEEP_BOUNTY: 25,
  SWEEP_STREAK_BONUS: 100,
  SWEEP_STREAK_THRESHOLD: 3,
  SWEEP_DAILY_CAP: 250,
  SWEEP_DAILY_CAP_COUNT: 10,

  // ─── Daily X share claim (app/api/claim/route.ts) ───────────────────
  DAILY_CLAIM: 10,
  STREAK_3_BONUS: 25,
  STREAK_7_BONUS: 100,
  STREAK_30_BONUS: 500,

  // ─── Floor defender — REMOVED ───────────────────────────────────────
  // Was 50 hex/day per citizen held 30d+. Set to 0 to retire cleanly.
  // Existing accrued hex is preserved; new accruals stop.
  FLOOR_DEFENDER_PER_DAY: 0,
  FLOOR_DEFENDER_MIN_DAYS: 30,

  // ─── NEW: Sale share ────────────────────────────────────────────────
  // When a wallet sells a freelon, they earn this percent of sale ETH
  // converted to hex via HEX_PER_ETH. Capped per 24h to deter wash.
  SALE_SHARE_PCT: 5,                 // 5% of sale ETH
  SALE_SHARE_MAX_PER_24H: 3,         // max 3 sales counted per wallet/day

  // ─── NEW: Fresh-blood bounty ────────────────────────────────────────
  // First freelon purchase ever for a wallet → one-time bounty.
  // Cooldown of 7d to deter sybil shuffling.
  FRESH_BLOOD_BOUNTY: 100,
  FRESH_BLOOD_COOLDOWN_DAYS: 7,

  // ─── NEW: Listing bounty ────────────────────────────────────────────
  // Reward wallets for keeping liquidity on the floor. Per-active-listing
  // per-day, with a per-wallet daily cap to stop list-cancel farming.
  LISTING_BOUNTY_PER_DAY: 5,
  LISTING_BOUNTY_DAILY_CAP: 25,

  // ─── NEW: Red Signal snipe ──────────────────────────────────────────
  // A listing priced ≤ RED_SIGNAL_THRESHOLD × floor is a "red signal".
  // Bounty = (floor - price) ETH × HEX_PER_ETH, capped at SNIPE_CAP.
  // Snipe is verified after SNIPE_HOLD_DAYS to deter flip-claim farming.
  RED_SIGNAL_THRESHOLD: 0.9,         // listings ≤90% floor flagged red
  SNIPE_BOUNTY_CAP: 500,
  SNIPE_MAX_PER_DAY: 3,
  SNIPE_COOLDOWN_HOURS: 4,
  SNIPE_HOLD_DAYS: 7,

  // ─── Daily mission (app/api/mission/claim) ──────────────────────────
  MISSION_REWARD: 5,

  // ─── Quests (lib/quests-store.ts) ───────────────────────────────────
  CITY_TOURIST_REWARD: 25,
  ARCHIVIST_REWARD: 100,
  HEX_HUNTER_REWARD: 75,
  DOCTRINE_MASTER_REWARD: 500,

  // ─── Burns / spends (priced against the new peg) ────────────────────
  TITHE_MIN: 250,                    // was 100
  NAMING_COST: 500,                  // was 100 — ~$17 at peg
  REALIGN_COST: 2_500,               // was 500 — ~$87 at peg
  BOOST_LISTING_PER_DAY: 100,        // pin on /market for 24h
  FEATURE_CITIZEN_24H: 1_000,        // hero slot on /civilizations
  CUSTOM_TITLE_COST: 5_000,          // vanity carrier title
  SIGNAL_BURST_COST: 2_500,          // homepage top-of-feed spotlight
  SHOP_MIN: 50,
  SHOP_MAX: 5_000,
} as const;

/** Convert ETH amount to hex using the canonical peg. */
export function ethToHex(eth: number): number {
  if (!isFinite(eth) || eth <= 0) return 0;
  return Math.round(eth * ECONOMY.HEX_PER_ETH);
}

export type EconomyKey = keyof typeof ECONOMY;
