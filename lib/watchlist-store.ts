/**
 * Watchlist store. A wallet can pay WATCHLIST_COST hex to "watch" a citizen.
 * When that citizen becomes a Red Signal, the watcher gets a 24-hour
 * PRIVATE WINDOW where they can buy without competing with the public
 * /dashboard feed.
 *
 * Mechanic:
 *   - Wallet adds tokenId to watchlist → debit hex
 *   - red-signals route, when flagging a token, checks watchlist; if any
 *     wallet is watching, the signal is marked "private" until 24h after
 *     the first flag, then upgrades to "public"
 *   - The /dashboard feed only shows public signals (or signals private
 *     to the viewer's own wallet, if we know who they are — out of scope
 *     for v1; we just hide private ones from everyone except via /watch)
 *
 * Storage:
 *   - Per-wallet: SET of tokenIds
 *   - Per-token reverse index: SET of wallets watching this token
 */

import { ECONOMY } from "@/lib/economy-constants";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export const WATCHLIST_COST = 50; // hex per token added

const memory = new Map<string, Set<number>>();     // address -> tokenIds
const memoryByToken = new Map<number, Set<string>>(); // tokenId -> addresses

const KEY_WALLET = (a: string) => `freelon:watch:v1:wallet:${a.toLowerCase()}`;
const KEY_TOKEN = (t: number) => `freelon:watch:v1:token:${t}`;
const TTL_SEC = 90 * 86400; // 90-day watchlist expiry

export async function addToWatchlist(address: string, tokenId: number): Promise<void> {
  const a = address.toLowerCase();
  if (!hasUpstash) {
    if (!memory.has(a)) memory.set(a, new Set());
    memory.get(a)!.add(tokenId);
    if (!memoryByToken.has(tokenId)) memoryByToken.set(tokenId, new Set());
    memoryByToken.get(tokenId)!.add(a);
    return;
  }
  await Promise.all([
    upstash(["SADD", KEY_WALLET(a), String(tokenId)]),
    upstash(["EXPIRE", KEY_WALLET(a), String(TTL_SEC)]),
    upstash(["SADD", KEY_TOKEN(tokenId), a]),
    upstash(["EXPIRE", KEY_TOKEN(tokenId), String(TTL_SEC)]),
  ]);
}

export async function removeFromWatchlist(address: string, tokenId: number): Promise<void> {
  const a = address.toLowerCase();
  if (!hasUpstash) {
    memory.get(a)?.delete(tokenId);
    memoryByToken.get(tokenId)?.delete(a);
    return;
  }
  await Promise.all([
    upstash(["SREM", KEY_WALLET(a), String(tokenId)]),
    upstash(["SREM", KEY_TOKEN(tokenId), a]),
  ]);
}

export async function getWatchlist(address: string): Promise<number[]> {
  const a = address.toLowerCase();
  if (!hasUpstash) return [...(memory.get(a) || [])];
  try {
    const raw = (await upstash(["SMEMBERS", KEY_WALLET(a)])) as string[] | null;
    return (raw || []).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

export async function getWatchersOfToken(tokenId: number): Promise<string[]> {
  if (!hasUpstash) return [...(memoryByToken.get(tokenId) || [])];
  try {
    const raw = (await upstash(["SMEMBERS", KEY_TOKEN(tokenId)])) as string[] | null;
    return raw || [];
  } catch {
    return [];
  }
}

/** Window during which a Red Signal is private to its watcher(s). */
export const PRIVATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Returns true if a red signal is still inside the watcher-exclusive window. */
export function isPrivateWindow(flaggedAt: number): boolean {
  return Date.now() - flaggedAt < PRIVATE_WINDOW_MS;
}

// Re-export the cost for UI display
export { ECONOMY };
