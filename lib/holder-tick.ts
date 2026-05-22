/**
 * Pull-based daily holder tick. Computes hex earned since the last snapshot
 * day for a wallet, based on the wallet's CURRENT citizen holdings and the
 * tier/civ-bonus structure. Caps catch-up to 30 days so dormant wallets
 * can't farm by skipping checks.
 *
 * Tier multipliers (caps whale farming, rewards collectors):
 *   1 citizen      → 1.0x
 *   2–5 citizens   → 1.2x
 *   6–20 citizens  → 1.5x
 *   21+ citizens   → 2.0x
 *
 * Civ bonuses (mutually exclusive — pick the higher):
 *   All citizens in same civ (≥2) → +25%
 *   Has ≥1 in every civ (10+)     → +25%
 *
 * Honorary / 1-of-1 bonuses are added on top:
 *   per honorary held              → +50 hex per week (≈ +7.14/day)
 *   per 1-of-1 held                → +200/day
 */

import { getWalletTokens } from "@/lib/wallet-tokens";
import citizensData from "@/data/citizens.json";
import { creditWalletHex, getWalletHex, todayUTC } from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";

type Citizen = { id: number; civilization: string; tier: string };

const ID_TO_CITIZEN = new Map<number, Citizen>();
for (const c of citizensData as Citizen[]) ID_TO_CITIZEN.set(c.id, c);

const MAX_CATCHUP_DAYS = ECONOMY.MAX_CATCHUP_DAYS;
const BASE_PER_CITIZEN_PER_DAY = ECONOMY.PER_CITIZEN_PER_DAY;
const HONORARY_PER_DAY = ECONOMY.HONORARY_BONUS_PER_WEEK / 7;
const ONE_OF_ONE_PER_DAY = ECONOMY.ONE_OF_ONE_BONUS_PER_DAY;

function tierMultiplier(balance: number): number {
  if (balance >= 21) return 2.0;
  if (balance >= 6) return 1.5;
  if (balance >= 2) return 1.2;
  return 1.0;
}

function diffDaysUTC(from: string, to: string): number {
  if (!from || !to) return 0;
  const f = Date.parse(from + "T00:00:00Z");
  const t = Date.parse(to + "T00:00:00Z");
  if (!isFinite(f) || !isFinite(t)) return 0;
  return Math.max(0, Math.round((t - f) / 86400000));
}

export type TickResult = {
  daysCredited: number;
  hexCredited: number;
  balance: number;
  tier: string;
  multiplier: number;
  civBonusPct: number;
  honoraryCount: number;
  oneOfOneCount: number;
};

/**
 * Compute + credit hex earned since the wallet's last snapshot day,
 * using the wallet's CURRENT holdings as a proxy for the past period.
 * Returns the breakdown; if 0 days due, no credit is made.
 */
export async function runHolderTick(address: string): Promise<TickResult> {
  const today = todayUTC();
  const rec = await getWalletHex(address);
  const last = rec.lastHolderTickDay;

  // First time we ever see this wallet: just stamp today, don't backfill.
  if (!last) {
    rec.lastHolderTickDay = today;
    // Persist the stamp via a credit of 0 (so the record is saved + cursor moves)
    const result = await emptyTick(address, today);
    return result;
  }

  let daysDue = diffDaysUTC(last, today);
  if (daysDue <= 0) {
    return emptyTick(address, today);
  }
  if (daysDue > MAX_CATCHUP_DAYS) daysDue = MAX_CATCHUP_DAYS;

  // Read on-chain holdings (capped at 500 in getWalletTokens)
  const tokens = await getWalletTokens(address, 500);
  if (!tokens || tokens.balance === 0) {
    // Stamp forward, no credit
    const cleared = await emptyTick(address, today);
    return cleared;
  }

  const balance = tokens.balance;
  const mult = tierMultiplier(balance);

  // Civ analysis
  const civCounts: Record<string, number> = {};
  let honoraryCount = 0;
  let oneOfOneCount = 0;
  for (const tid of tokens.tokenIds) {
    const c = ID_TO_CITIZEN.get(tid);
    if (!c) continue;
    civCounts[c.civilization] = (civCounts[c.civilization] || 0) + 1;
    if (c.tier === "Honorary") honoraryCount++;
    else if (c.tier === "One of One") oneOfOneCount++;
  }
  const uniqueCivs = Object.keys(civCounts).length;
  let civBonusPct = 0;
  if (uniqueCivs === 1 && balance >= 2) civBonusPct = 25;
  else if (uniqueCivs >= 10) civBonusPct = 25;

  const dailyBase = balance * BASE_PER_CITIZEN_PER_DAY * mult;
  const dailyBonus = dailyBase * (civBonusPct / 100);
  const dailyHonorary = honoraryCount * HONORARY_PER_DAY;
  const dailyOneOfOne = oneOfOneCount * ONE_OF_ONE_PER_DAY;
  const perDay = dailyBase + dailyBonus + dailyHonorary + dailyOneOfOne;

  const credit = Math.round(perDay * daysDue);

  if (credit > 0) {
    await creditWalletHex(address, credit, {
      kind: "hold",
      note: `${daysDue}d × ${balance} citizens (${tier(balance)} ${mult}x${
        civBonusPct ? ` +${civBonusPct}%` : ""
      })`,
    });
  }

  // Update cursor
  const after = await getWalletHex(address);
  after.lastHolderTickDay = today;
  const { setWalletHex } = await import("@/lib/wallet-hex-store");
  await setWalletHex(after);

  return {
    daysCredited: daysDue,
    hexCredited: credit,
    balance,
    tier: tier(balance),
    multiplier: mult,
    civBonusPct,
    honoraryCount,
    oneOfOneCount,
  };
}

function tier(balance: number): string {
  if (balance >= 21) return "Whale";
  if (balance >= 6) return "Collector";
  if (balance >= 2) return "Carrier";
  return "Initiate";
}

async function emptyTick(address: string, today: string): Promise<TickResult> {
  const rec = await getWalletHex(address);
  rec.lastHolderTickDay = today;
  const { setWalletHex } = await import("@/lib/wallet-hex-store");
  await setWalletHex(rec);
  return {
    daysCredited: 0,
    hexCredited: 0,
    balance: 0,
    tier: "Initiate",
    multiplier: 1,
    civBonusPct: 0,
    honoraryCount: 0,
    oneOfOneCount: 0,
  };
}
