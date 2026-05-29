/**
 * HOLD THE LINE — distributed bid-wall mission store.
 *
 * Mission: holders place OpenSea bids above floor × 1.4. Each
 * qualifying bid earns hex (+500 base, +1000 if it fills, +2000
 * one-time DEFENDER OF THE FLOOR badge for holding 7+ days).
 *
 * Storage (Upstash):
 *   freelon:defender:bid:<txOrId>   — single bid record
 *   freelon:defender:idx            — sorted set of bidIds by timestamp
 *   freelon:defender:wallet:<addr>  — bid count for a wallet (for leaderboard)
 *   freelon:defender:stats          — { totalBids, totalDefenders, hexCredited }
 *
 * v1 is manual-claim: holder places bid → submits offer URL or tx hash
 * via /hold-the-line claim form → admin (founder) verifies + credits.
 * v2 will auto-detect via OpenSea offers API on the sweep-bounty cron.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const KEY_STATS = "freelon:defender:stats";
const KEY_IDX = "freelon:defender:idx";
const KEY_BID = (id: string) => `freelon:defender:bid:${id}`;
const KEY_WALLET = (addr: string) => `freelon:defender:wallet:${addr.toLowerCase()}`;

const memStats = { totalBids: 0, totalDefenders: 0, hexCredited: 0 };
const memBids = new Map<string, DefenderBid>();
const memWallets = new Map<string, number>();

export type DefenderBid = {
  id: string;
  wallet: string;
  bidEth: number;
  floorEthAtBid: number;
  status: "active" | "filled" | "expired";
  placedAt: number;
  filledAt?: number;
  filledTokenId?: number;
  hexCredited: number;
};

export type DefenderStats = {
  totalBids: number;
  totalDefenders: number;
  hexCredited: number;
  topDefenders: Array<{ wallet: string; bidCount: number }>;
};

export async function recordBid(input: {
  wallet: string;
  bidEth: number;
  floorEthAtBid: number;
  evidenceUrl?: string;
}): Promise<DefenderBid> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rec: DefenderBid = {
    id,
    wallet: input.wallet.toLowerCase(),
    bidEth: input.bidEth,
    floorEthAtBid: input.floorEthAtBid,
    status: "active",
    placedAt: Date.now(),
    hexCredited: 0,
  };
  if (!hasUpstash) {
    memBids.set(id, rec);
    memWallets.set(rec.wallet, (memWallets.get(rec.wallet) || 0) + 1);
    memStats.totalBids++;
    if ((memWallets.get(rec.wallet) || 0) === 1) memStats.totalDefenders++;
    return rec;
  }
  try {
    await upstash(["SETEX", KEY_BID(id), "5184000", JSON.stringify(rec)]); // 60d TTL
    await upstash(["ZADD", KEY_IDX, String(rec.placedAt), id]);
    const newWalletCount = await upstash(["INCR", KEY_WALLET(rec.wallet)]);
    await upstash(["EXPIRE", KEY_WALLET(rec.wallet), "5184000"]);
    // Stats update — read-modify-write (acceptable for now, leaderboard
    // is approximate by design)
    const raw = (await upstash(["GET", KEY_STATS])) as string | null;
    const stats = raw ? JSON.parse(raw) as { totalBids: number; totalDefenders: number; hexCredited: number } : { totalBids: 0, totalDefenders: 0, hexCredited: 0 };
    stats.totalBids++;
    if (Number(newWalletCount) === 1) stats.totalDefenders++;
    await upstash(["SET", KEY_STATS, JSON.stringify(stats)]);
  } catch {/* non-fatal — UI shows what it can */}
  return rec;
}

export async function getStats(): Promise<DefenderStats> {
  if (!hasUpstash) {
    const top = [...memWallets.entries()]
      .map(([wallet, bidCount]) => ({ wallet, bidCount }))
      .sort((a, b) => b.bidCount - a.bidCount)
      .slice(0, 10);
    return { ...memStats, topDefenders: top };
  }
  try {
    const raw = (await upstash(["GET", KEY_STATS])) as string | null;
    const base = raw ? JSON.parse(raw) as Omit<DefenderStats, "topDefenders"> : { totalBids: 0, totalDefenders: 0, hexCredited: 0 };
    // Top defenders: pull most-recent 100 bids, group by wallet
    const recentIds = (await upstash(["ZREVRANGE", KEY_IDX, "0", "99"])) as string[] | null;
    const counts = new Map<string, number>();
    if (recentIds && recentIds.length > 0) {
      const raws = (await upstash(["MGET", ...recentIds.map(KEY_BID)])) as (string | null)[];
      for (const r of raws) {
        if (!r) continue;
        try {
          const b = JSON.parse(r) as DefenderBid;
          counts.set(b.wallet, (counts.get(b.wallet) || 0) + 1);
        } catch {/* skip */}
      }
    }
    const top = [...counts.entries()]
      .map(([wallet, bidCount]) => ({ wallet, bidCount }))
      .sort((a, b) => b.bidCount - a.bidCount)
      .slice(0, 10);
    return { ...base, topDefenders: top };
  } catch {
    return { totalBids: 0, totalDefenders: 0, hexCredited: 0, topDefenders: [] };
  }
}

export async function bumpHexCredited(amount: number): Promise<void> {
  if (!hasUpstash) {
    memStats.hexCredited += amount;
    return;
  }
  try {
    const raw = (await upstash(["GET", KEY_STATS])) as string | null;
    const stats = raw ? JSON.parse(raw) as { totalBids: number; totalDefenders: number; hexCredited: number } : { totalBids: 0, totalDefenders: 0, hexCredited: 0 };
    stats.hexCredited += amount;
    await upstash(["SET", KEY_STATS, JSON.stringify(stats)]);
  } catch {/* non-fatal */}
}
