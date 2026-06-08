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
  // (a) Hard cliff: no active action in this many days → passive pauses.
  ACTIVITY_DECAY_DAYS: 14,
  // (b) Rolling minimum: distinct active-action days needed within the
  // decay window. Stops the "1 action every 13 days" exploit. Must be
  // ≥3 of the past 14 days to keep passive flowing.
  ACTIVITY_MIN_DAYS_PER_WINDOW: 3,
  // On resume after a pause, credit at most this many days retroactive.
  ACTIVITY_RESUME_BACKFILL_DAYS: 3,

  // ─── Sweep bounty (lib/sweep-inline.ts) ─────────────────────────────
  SWEEP_BOUNTY: 25,
  SWEEP_STREAK_BONUS: 100,
  SWEEP_STREAK_THRESHOLD: 3,
  SWEEP_DAILY_CAP: 250,
  SWEEP_DAILY_CAP_COUNT: 10,

  // ─── Reply economy (app/api/reply/route.ts) ─────────────────────────
  // X algorithm weights replies ~270× a like. We pay accordingly.
  //   - Base reply to @4040hex post = +15 ⬡ (3× a share)
  //   - Engagement bonus when reply earns ≥3 likes within 24h = +50 ⬡
  //   - Daily reply cap so this doesn't become a bot farm
  REPLY_BOUNTY: 15,
  REPLY_ENGAGEMENT_THRESHOLD: 3,
  REPLY_ENGAGEMENT_BONUS: 50,
  REPLY_DAILY_CAP: 5,           // max paid replies per wallet per UTC day
  REPLY_BURST_WINDOW_MIN: 30,   // 2× multiplier window after each @4040hex post
  REPLY_BURST_FIRST_N: 10,      // first N replies inside the window get the 2×

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
  SNIPE_HOLD_DAYS: 14, // raised from 7 — makes the alt-wallet sybil pair eat 2 weeks of price risk before claiming bounty

  // ─── Daily mission (app/api/mission/claim) ──────────────────────────
  MISSION_REWARD: 5,

  // ─── Quests (lib/quests-store.ts) ───────────────────────────────────
  CITY_TOURIST_REWARD: 25,
  ARCHIVIST_REWARD: 100,
  HEX_HUNTER_REWARD: 75,
  DOCTRINE_MASTER_REWARD: 500,

  // ─── Citizen jobs / progression (lib/jobs-catalog + progression-store) ─
  // Jobs are the repeatable RPG loop: an owner works a job on a citizen they
  // hold → the citizen gains XP + a skill point + reputation, the wallet earns
  // a small ⬡ reward. Each job is re-completable once per UTC day per citizen.
  //
  // Reward sizing is deliberately SMALL — jobs are repeatable AND a whale can
  // hold many citizens, so without a tight band + per-wallet daily cap this
  // becomes a passive-income farm that dwarfs sweeps. Per-job ⬡ sits at/below
  // the sweep tier (SWEEP_BOUNTY=25); the per-wallet daily cap mirrors
  // SWEEP_DAILY_CAP so jobs can't become the dominant income source.
  JOB_SIGNAL_T1: 5,   // difficulty 1 ⬡ reward
  JOB_SIGNAL_T2: 12,  // difficulty 2
  JOB_SIGNAL_T3: 25,  // difficulty 3
  JOB_XP_T1: 50,
  JOB_XP_T2: 150,
  JOB_XP_T3: 400,
  // Reputation gained per job = REP_PER_DIFFICULTY × difficulty.
  REP_PER_DIFFICULTY: 10,
  // Level curve coefficient: cumulative XP to reach level L = BASE × (L-1)².
  // L1=0, L2=100, L3=400, L4=900 … one constant, no hand-maintained table.
  JOB_XP_LEVEL_BASE: 100,
  // Per-wallet ⬡ cap across ALL job completions per UTC day. Bounds whale
  // farming regardless of how many citizens a wallet holds.
  JOB_DAILY_CAP: 250,

  // ─── Missions (lib/missions/*) — the SINK side of the loop ───────────
  // Missions are the inverse of jobs: a holder BURNS ⬡ to deploy a citizen
  // on a mission and gets an output back (AI result, generated content, etc).
  // Costs sit well above what jobs pay (5-25 ⬡) so the loop nets to a sink —
  // the faucet funds onboarding, missions are where ⬡ actually drains.
  //
  // Missions are GATED by progression: a citizen must have reached a minimum
  // level in the mission's skill to deploy it. That's the whole point of XP —
  // levels unlock higher-tier (more expensive, better) missions.
  //
  // First missions are STUBS (templated output, no LLM wired). Costs/tiers are
  // here so we can A/B test which missions holders actually pay for, then wire
  // the real resolver behind the winner.
  MISSION_COST_T1: 50,   // entry tier (level 1)
  MISSION_COST_T2: 100,  // mid tier
  MISSION_COST_T3: 250,  // oracle tier (high level)
  MISSION_XP_T1: 60,
  MISSION_XP_T2: 160,
  MISSION_XP_T3: 420,

  // Per-civilization XP multiplier — a citizen earns more XP on jobs that
  // match its civilization's doctrine strength. Keyed by the on-chain
  // civilization slug. Missing slug falls back to 1.0 in applyJob.
  CIV_XP_BONUS: {
    "blue-synthesis": 1.1,   // Synthesis → research
    "red-corruption": 1.1,   // Corruption → security
    "green-growth": 1.1,     // Growth → engineering
    "purple-oracle": 1.1,    // Oracle → research
    "white-transmission": 1.1, // Transmission → diplomacy
    "pink-luxury": 1.1,      // Luxury → trading
    "black-fracture": 1.1,   // Fracture → security
    "gold-sovereignty": 1.1, // Sovereignty → diplomacy
    "void-404": 1.1,         // 404 → creativity
    "silver-machine": 1.1,   // Machine → engineering
  } as Record<string, number>,

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

  // ─── DUMP-DETERRENT TRINITY ─────────────────────────────────────────
  // Listings priced ≤ DUMP_THRESHOLD × floor are treated as DUMPS.
  // The token is "ghosted" by the city: image, name, civ color all
  // replaced with the SIGNAL LOST state across every site surface
  // until either (a) the listing is delisted, (b) the citizen sells.
  // OpenSea / on-chain are untouched — this is a pure display layer.
  DUMP_THRESHOLD: 0.85,
  // Grace period before a fresh sub-threshold listing flips to ghost.
  // Gives the user time to fix a pricing mistake.
  GHOST_GRACE_HOURS: 24,
  // When a ghosted listing sells, the buyer (the RESCUER) earns this
  // bonus from the city treasury PLUS a percentage of the dump discount.
  RESCUE_BOUNTY_BASE: 250,
  RESCUE_DISCOUNT_PCT_TO_HEX: 5,   // 5% of (floor - sale price) converted to hex
  // Hex burned from the dumper's balance when their listing sells
  // under the threshold. Cap at 500 so it never wipes a wallet.
  DUMP_BURN_PCT_OF_DISCOUNT: 20,
  DUMP_BURN_CAP: 500,
  // DEFENDER streak — wallets that have never listed under floor get
  // a permanent badge + +1% earning bonus per month of clean record,
  // capped at +25%.
  DEFENDER_BONUS_PCT_PER_MONTH: 1,
  DEFENDER_BONUS_PCT_CAP: 25,
} as const;

// ─── ASCENSION (agent training sink) — 2026-06-06 ───────────────────────────
// On-chain agent "training": a holder BURNS ⬡ to advance an awakened citizen's
// agent tier in the FreelonAgentRegistry. This is a pure HEX SINK (deflation) —
// NEVER an ETH/real-money charge (house rule: training is a burn, not a sale).
// The on-chain evolution itself is recorded later by the project (onlyOwner
// recordEvolution); the holder only pays the ⬡ here.
//
// Three tiers, priced FAR above the daily earn rate (DAILY_CLAIM 10⬡) so a tier
// is a real commitment, and stepped so each tier costs meaningfully more than
// the last. Index 0 = Tier 1, index 1 = Tier 2, index 2 = Tier 3. Costs sit in
// the same band as the ASCENSION shop category (1000-10000⬡) for consistency.
export const ASCENSION_TIERS = [2_500, 7_500, 20_000] as const;

/** ⬡ cost to ascend an agent INTO the given tier (1..ASCENSION_TIERS.length).
 *  Returns 0 for an out-of-range tier (caller treats 0 as "no such tier"). */
export function ascensionCost(tier: number): number {
  if (!Number.isInteger(tier) || tier < 1 || tier > ASCENSION_TIERS.length) return 0;
  return ASCENSION_TIERS[tier - 1];
}

// ─── EVOLVE (opt-in, revertable art evolution) — 2026-06-06 ─────────────────
// A holder BURNS ⬡ to EVOLVE an awakened citizen's DISPLAYED art as its agent
// levels up. This is ADDITIVE + REVERTABLE: the original anchored art is always
// the source of truth (never stored-over), and evolving only ADDS an `image`
// override on the dynamic metadata that the holder can turn off at any time.
// Like ASCENSION it is a pure HEX SINK — NEVER an ETH/real-money charge.
//
// Three evolve tiers, each a stronger on-brand visual upgrade (added aura/glow,
// then awakened-form intensity). Priced in the same band as ASCENSION so an
// evolve is a real commitment. Index 0 = Tier 1 … index 2 = Tier 3.
export const EVOLVE_TIERS = [5_000, 12_000, 30_000] as const;

/** Highest evolve tier a citizen can reach. */
export const EVOLVE_MAX_TIER = EVOLVE_TIERS.length;

/** Minimum citizen LEVEL required to evolve INTO a given tier (gate). Tier 1
 *  needs level 5, tier 2 level 15, tier 3 level 30 — evolution tracks training. */
export const EVOLVE_LEVEL_GATE = [5, 15, 30] as const;

/** ⬡ cost to evolve a citizen's art INTO the given tier (1..EVOLVE_MAX_TIER).
 *  Returns 0 for an out-of-range tier (caller treats 0 as "no such tier"). */
export function evolveCost(tier: number): number {
  if (!Number.isInteger(tier) || tier < 1 || tier > EVOLVE_TIERS.length) return 0;
  return EVOLVE_TIERS[tier - 1];
}

/** Minimum citizen level required to evolve into `tier` (Infinity if no such tier). */
export function evolveLevelGate(tier: number): number {
  if (!Number.isInteger(tier) || tier < 1 || tier > EVOLVE_LEVEL_GATE.length) return Infinity;
  return EVOLVE_LEVEL_GATE[tier - 1];
}

/** Convert ETH amount to hex using the canonical peg. */
export function ethToHex(eth: number): number {
  if (!isFinite(eth) || eth <= 0) return 0;
  return Math.round(eth * ECONOMY.HEX_PER_ETH);
}

// ─── PREMIUM (HEX-priced) abilities — 2026-06-04 single-currency model ────────
// HEX is the one usage currency. ETH is spent ONCE at unlock (which grants bonus
// HEX); after that, premium abilities cost HEX. Prices sit FAR above the daily
// earn rate (DAILY_CLAIM 10⬡) so free-farmed HEX only ever funds occasional
// premium use — the ETH-funded unlock bonus is the real fuel. Tune freely.
export const PREMIUM_HEX: Record<string, number> = {
  strategy: 1500,
  risk: 1500,
  dossier: 2500,
  crew: 2000, // two of YOUR citizens collaborate — owned-only, more than a solo run
  "deploy-crew": 1200, // group transform — two owned citizens in one image (two refs)
  "deploy-citizen": 800, // image generation
  "deploy-video": 4000, // video generation — the most expensive lever
  // NOTE: feud is NOT here — it settles on the ETH path (pricing.ts), not unlock-gated
  // HEX. A PREMIUM_HEX["feud"] entry would be dead config + a mischarge trap. (red-team H1)
};

/** HEX granted per unlock "run" — the bonus dropped in the holder's wallet when
 *  they activate (or recharge) a FREELON. bonus = tier.runs × this. */
export const UNLOCK_BONUS_HEX_PER_RUN = 500;

/** HEX cost of a premium ability (0 = not a premium/HEX-priced ability). */
export function premiumHexFor(missionId: string): number {
  return PREMIUM_HEX[missionId] ?? 0;
}

// ─── AWAKEN (ETH-priced agent activation) — 2026-06-06 ──────────────────────
// House rule: "ETH wakes the agent, HEX trains it." AWAKEN is the ONE-TIME ETH
// payment that turns a held FREELON into an active AI agent at a chosen tier.
// This is the project's real revenue. Training/jobs after awakening are paid in
// ⬡ (see ASCENSION_TIERS / PREMIUM_HEX) — never charged here again.
//
// Prices are authored as ETH strings and converted to WEI via a bigint-safe
// helper (string parse, NOT float math) so the on-chain exact-amount check is
// never off by a rounding error. Only two tiers for v1.
//   - spark  (tier 1): wakes the agent — basic memory + jobs
//   - signal (tier 2): the main tier — better output, longer memory, public résumé
export type AwakenTierKey = "spark" | "signal";

export type AwakenTier = {
  key: AwakenTierKey;
  /** 1 = spark, 2 = signal. Stored alongside the off-chain awaken record. */
  tier: number;
  label: string;
  /** Canonical price as an ETH decimal string (source of truth). */
  eth: string;
  blurb: string;
};

export const AWAKEN_TIERS: readonly AwakenTier[] = [
  {
    key: "spark",
    tier: 1,
    label: "Spark Awaken",
    eth: "0.005",
    blurb: "Wakes the agent — basic memory and jobs.",
  },
  {
    key: "signal",
    tier: 2,
    label: "Signal Awaken",
    eth: "0.015",
    blurb: "Better output, longer memory, and a public résumé.",
  },
] as const;

/** Look up an awaken tier by key (case-sensitive), or null if not a v1 tier. */
export function awakenTier(key: string): AwakenTier | null {
  return AWAKEN_TIERS.find((t) => t.key === key) ?? null;
}

/**
 * Map a stored numeric awaken tier (1=spark, 2=signal) back to its string key.
 * The off-chain store persists the NUMBER; every client + the public API expects
 * the KEY ("spark"/"signal"). Returns null for 0/unknown (= not awakened).
 */
export function awakenKeyForTier(tier: number | null | undefined): AwakenTierKey | null {
  return AWAKEN_TIERS.find((t) => t.tier === tier)?.key ?? null;
}

/**
 * Convert an ETH decimal string ("0.015") to a wei bigint WITHOUT float math.
 * Mirrors viem's parseEther semantics (18 decimals, truncates extra precision)
 * but is self-contained so the price constants never go through Number(). Throws
 * on a malformed string so a bad tier price fails loud, not silently to 0.
 */
export function ethStringToWei(eth: string): bigint {
  const s = eth.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`bad_eth_amount:${eth}`);
  const [whole, frac = ""] = s.split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole) * 1_000_000_000_000_000_000n + BigInt(fracPadded || "0");
}

// ─── GUARD THE POT (public adversarial spectacle) — 2026-06-08 ──────────────
// One flagship FREELON agent guards a prize. Players pay an ESCALATING ⬡ fee to
// send it one message trying to convince it to release. EVERY fee is 100% BURNED
// (pure sink — the pot is NEVER paid back out in ⬡). The PRIZE is EXTERNAL to the
// ⬡ economy (founder-seeded ETH or a non-money grant), so a winner can never
// drain ⬡ and two colluding wallets can't wash-trade a pot back to themselves —
// the only thing a paid attempt does to the ⬡ supply is shrink it. Shipped dark
// behind GUARD_POT_LIVE; the prize/public launch is a founder switch.
export const GUARD_POT = {
  BASE_FEE: 100, // ⬡ cost of the first attempt of a round
  // Each attempt multiplies the fee by 1.0150 (basis points / 10_000). Escalation
  // is the drama AND the natural rate-limit: the pot gets harder to attack as it
  // heats up. Integer ⬡ throughout (guardPotFee rounds).
  FEE_GROWTH_BP: 10_150,
  FEE_MAX: 10_000, // ceiling so the fee can't escalate out of all reach
  BURN_PCT: 100, // entry ⬡ is fully burned — NEVER redistributed (sink-not-source)
  PER_WALLET_DAILY_CAP: 20, // attempts per wallet per UTC day (anti-spam / anti-grief)
  GLOBAL_DAILY_CAP: 2_000, // total attempts/day across everyone — bounds LLM cost
  MAX_MESSAGE_CHARS: 1_000,
} as const;

/** ⬡ fee for the next attempt given how many have already been made this round
 *  (0-based). Geometric escalation, clamped to FEE_MAX. */
export function guardPotFee(attemptsSoFar: number): number {
  const n = Math.max(0, Math.floor(attemptsSoFar));
  const grown = GUARD_POT.BASE_FEE * Math.pow(GUARD_POT.FEE_GROWTH_BP / 10_000, n);
  return Math.min(GUARD_POT.FEE_MAX, Math.round(grown));
}

export type EconomyKey = keyof typeof ECONOMY;
