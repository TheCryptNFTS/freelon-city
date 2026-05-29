/**
 * Sweeper store — aggregates "who bought multiple citizens lately."
 *
 * Sister system to defender-store (which tracks bid-wall offers).
 * Where defender-store answers "who placed a defender BID", this
 * answers "who SWEPT citizens off the floor." Two different actions.
 *
 * Founder spec 2026-05-24:
 *   "the existing /hold-the-line page only shows defenders who placed
 *   collection offers (WETH bids ≥1.4× floor). It does NOT show
 *   sweepers (buyers who just clicked Buy on listings at floor)."
 *
 * Storage (Upstash with in-memory fallback):
 *   freelon:sweeper:event:{tx}:{tokenId}     — SETNX dedupe (60d TTL)
 *   freelon:sweeper:recent:list              — Redis LIST of recent
 *                                              sweep events (JSON-encoded)
 *                                              LPUSH on new, LTRIM to 400
 *
 * Read returns "top sweepers in last N hours" by aggregating the LIST
 * client-side. Lightweight — 400 entries × ~140 bytes ≈ 55KB max.
 *
 * Idempotent: re-seeing the same tx:tokenId in a retry is a no-op.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type SweepEvent = {
  wallet: string;
  tokenId: number;
  priceEth: number;
  ts: number; // unix sec
  tx: string;
};

export type SweeperRow = {
  wallet: string;
  count: number;
  volEth: number;
  lastTs: number;
  tokenIds: number[]; // up to 6 most recent
};

const KEY_LIST = "freelon:sweeper:recent:list";
const KEY_EVENT = (tx: string, tokenId: number) =>
  `freelon:sweeper:event:${tx}:${tokenId}`;
const LIST_CAP = 400;
const EVENT_TTL_SEC = 60 * 24 * 3600; // 60d

const mem: { list: SweepEvent[]; seen: Set<string> } = {
  list: [],
  seen: new Set(),
};

/**
 * Record a sweep event. Idempotent on (tx, tokenId).
 *
 * Called from the sweep-bounty cron's per-event loop. Failure is
 * non-fatal — the cron's primary credit work has already succeeded.
 */
export async function recordSweep(ev: SweepEvent): Promise<{ recorded: boolean }> {
  const wallet = ev.wallet.toLowerCase();
  const eventKey = KEY_EVENT(ev.tx, ev.tokenId);
  if (hasUpstash) {
    try {
      const setRes = await upstash([
        "SET", eventKey, "1", "NX", "EX", String(EVENT_TTL_SEC),
      ]);
      if (setRes !== "OK") return { recorded: false };
      const payload = JSON.stringify({ ...ev, wallet });
      await upstash(["LPUSH", KEY_LIST, payload]);
      await upstash(["LTRIM", KEY_LIST, "0", String(LIST_CAP - 1)]);
      return { recorded: true };
    } catch {
      // fall through to in-memory
    }
  }
  if (mem.seen.has(eventKey)) return { recorded: false };
  mem.seen.add(eventKey);
  mem.list.unshift({ ...ev, wallet });
  if (mem.list.length > LIST_CAP) mem.list.length = LIST_CAP;
  return { recorded: true };
}

/**
 * Top sweepers in the trailing `windowHours` window, ranked by count
 * then by volEth tiebreaker.
 *
 * Default 4h matches sales-pulse + sweep-burst cadence so the
 * "recent sweepers" panel reflects the same window the X burst
 * looks at.
 */
export async function getTopSweepers(input: {
  windowHours?: number;
  limit?: number;
} = {}): Promise<SweeperRow[]> {
  const windowHours = input.windowHours ?? 4;
  const limit = input.limit ?? 10;
  const cutoffSec = Math.floor(Date.now() / 1000) - windowHours * 3600;

  let raw: string[] = [];
  if (hasUpstash) {
    try {
      const r = (await upstash(["LRANGE", KEY_LIST, "0", String(LIST_CAP - 1)])) as unknown;
      if (Array.isArray(r)) raw = r as string[];
    } catch {
      raw = [];
    }
  }
  // Always include in-memory events too — dev parity + cheap belt.
  for (const ev of mem.list) raw.push(JSON.stringify(ev));

  const parsed: SweepEvent[] = [];
  for (const s of raw) {
    try {
      const e = JSON.parse(s) as SweepEvent;
      if (!e?.wallet || !e?.tx || !e?.tokenId) continue;
      if (e.ts < cutoffSec) continue;
      parsed.push(e);
    } catch {/* skip malformed */}
  }

  // Aggregate by wallet
  const byWallet = new Map<string, SweeperRow>();
  for (const e of parsed) {
    const cur = byWallet.get(e.wallet) ?? {
      wallet: e.wallet,
      count: 0,
      volEth: 0,
      lastTs: 0,
      tokenIds: [],
    };
    cur.count++;
    cur.volEth += e.priceEth;
    if (e.ts > cur.lastTs) cur.lastTs = e.ts;
    if (cur.tokenIds.length < 6) cur.tokenIds.push(e.tokenId);
    byWallet.set(e.wallet, cur);
  }

  return [...byWallet.values()]
    .sort((a, b) => (b.count - a.count) || (b.volEth - a.volEth))
    .slice(0, limit);
}
