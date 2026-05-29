/**
 * Red Signal store — tracks listings flagged as "red signal" (priced
 * ≤ RED_SIGNAL_THRESHOLD × floor) so the snipe-bounty crediter can
 * verify-and-pay AFTER the SNIPE_HOLD_DAYS window.
 *
 * Flow:
 *   1. /api/market/red-signals (cached) polls OpenSea listings, computes
 *      which are below threshold, and writes them here.
 *   2. Holder-tick reads recent transfer-in events for the wallet,
 *      matches them against flagged listings older than SNIPE_HOLD_DAYS,
 *      credits the bounty if still owned, then marks the entry claimed.
 *
 * Records keep a 30-day TTL — anything older is irrelevant.
 */

import { ECONOMY } from "@/lib/economy-constants";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export type RedSignal = {
  tokenId: number;
  /** Listing price in ETH at flag time. */
  priceEth: number;
  /** Collection floor at flag time, used to compute bounty. */
  floorEth: number;
  /** Seller address (lowercased) — used for per-seller-per-week cap. */
  seller: string;
  /** UTC timestamp (ms) when first flagged. */
  flaggedAt: number;
  /** Watchers at the moment of flag — frozen snapshot. Only these wallets
   * can see the signal during its 24h private window. Watchers added
   * AFTER the flag don't get the private window for this signal — stops
   * the "speculate cheap" exploit. */
  watchersAtFlag?: string[];
  /** Wallets that claimed (rare — usually empty until claim time). */
  claimedBy?: string;
  claimedAt?: number;
};

const memory = new Map<string, RedSignal>();

const KEY = (tokenId: number) => `freelon:redSignal:v1:${tokenId}`;
const TTL_SEC = 30 * 86400;

export async function getRedSignal(tokenId: number): Promise<RedSignal | null> {
  if (!hasUpstash) return memory.get(String(tokenId)) ?? null;
  try {
    const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
    return raw ? (JSON.parse(raw) as RedSignal) : null;
  } catch {
    return null;
  }
}

export async function setRedSignal(rs: RedSignal): Promise<void> {
  if (!hasUpstash) {
    memory.set(String(rs.tokenId), rs);
    return;
  }
  await upstash(["SETEX", KEY(rs.tokenId), String(TTL_SEC), JSON.stringify(rs)]);
}

/** Compute the bounty for a flagged listing, capped at SNIPE_BOUNTY_CAP. */
export function snipeBounty(rs: RedSignal): number {
  const diff = Math.max(0, rs.floorEth - rs.priceEth);
  const raw = Math.round(diff * ECONOMY.HEX_PER_ETH);
  return Math.min(raw, ECONOMY.SNIPE_BOUNTY_CAP);
}

/** Whether the listing meets the "red signal" threshold (≤90% floor). */
export function isRedSignal(priceEth: number, floorEth: number): boolean {
  if (floorEth <= 0 || priceEth <= 0) return false;
  return priceEth <= floorEth * ECONOMY.RED_SIGNAL_THRESHOLD;
}
