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
  // Passive holding (lib/holder-tick.ts)
  PER_CITIZEN_PER_DAY: 1,
  ONE_OF_ONE_BONUS_PER_DAY: 200,
  HONORARY_BONUS_PER_WEEK: 50,
  MAX_CATCHUP_DAYS: 30,

  // Sweep bounty (lib/sweep-inline.ts, app/api/cron/sweep-bounty)
  SWEEP_BOUNTY: 25,
  SWEEP_STREAK_BONUS: 100,
  SWEEP_STREAK_THRESHOLD: 3,
  SWEEP_DAILY_CAP: 250, // = SWEEP_BOUNTY * 10
  SWEEP_DAILY_CAP_COUNT: 10,

  // Daily X share claim (app/api/claim/route.ts)
  DAILY_CLAIM: 10,
  STREAK_3_BONUS: 25,
  STREAK_7_BONUS: 100,
  STREAK_30_BONUS: 500,

  // Floor defender (lib/floor-defender.ts)
  FLOOR_DEFENDER_PER_DAY: 50,
  FLOOR_DEFENDER_MIN_DAYS: 30,

  // Daily mission (app/api/mission/claim)
  MISSION_REWARD: 5,

  // Quests (lib/quests-store.ts)
  CITY_TOURIST_REWARD: 25,
  ARCHIVIST_REWARD: 100,
  HEX_HUNTER_REWARD: 75,
  DOCTRINE_MASTER_REWARD: 500,

  // Burns / spends
  TITHE_MIN: 100,
  NAMING_COST: 100,         // displayed on /earn — not yet enforced in /api/name (drift)
  REALIGN_COST: 500,
  SHOP_MIN: 50,             // actual min in data/shop-items.json (display says 250 — drift)
  SHOP_MAX: 5000,
} as const;

export type EconomyKey = keyof typeof ECONOMY;
