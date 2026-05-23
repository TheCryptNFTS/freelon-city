/**
 * GHOST store — the display-layer kill switch for under-floor listings.
 *
 * When a citizen is listed at ≤ DUMP_THRESHOLD × floor for longer than
 * GHOST_GRACE_HOURS, we mark it "ghosted" here. Every citizen-rendering
 * surface checks this flag and replaces image/name/civ with the canon
 * SIGNAL LOST state until the listing resolves (delist or sale).
 *
 * On sale → rescue attribution is written here, the dumper's hex burns
 * proportional to the discount, the rescuer earns hex from the city.
 *
 * Storage:
 *   freelon:ghost:v1:<tokenId>            → JSON GhostRecord
 *   freelon:ghost:idx                     → sorted set of currently-
 *                                            ghosted token ids (score = ghostedAt)
 *   freelon:ghost:rescued:<tokenId>       → JSON RescueRecord (permanent)
 *   freelon:ghost:dumps:idx               → sorted set of dump events
 *                                            (score = ts) for the public Dump Ledger
 *   freelon:ghost:defender:<wallet>       → cleanSince (unix ms)
 *
 * Server-rendered components read getGhost() / getRescue() once per
 * page. Cheap because the lookup is a single GET per citizen.
 */

import { ECONOMY } from "@/lib/economy-constants";

export type GhostRecord = {
  tokenId: number;
  /** Seller wallet (lowercased). */
  seller: string;
  /** Listing price in ETH at flag time. */
  priceEth: number;
  /** Collection floor at flag time. */
  floorEth: number;
  /** Discount fraction (0..1). 0.20 means 20% under floor. */
  discount: number;
  /** Unix ms when the city first noticed the under-floor listing. */
  firstSeenAt: number;
  /** Unix ms when the grace period ended and the ghost officially landed. */
  ghostedAt: number;
  /** "ghosted" | "resolved" (sold/delisted). Resolved entries are kept
   * briefly so the UI can show a "RESCUED" celebration before clearing. */
  status: "ghosted" | "resolved";
};

export type RescueRecord = {
  tokenId: number;
  /** Wallet of the rescuer (lowercased) — the buyer. */
  rescuer: string;
  /** Wallet of the original dumper (lowercased) — the seller. */
  dumper: string;
  /** Price the rescuer paid in ETH. */
  priceEth: number;
  /** Floor at time of rescue. */
  floorEth: number;
  /** Hex paid to the rescuer (treasury bounty + discount-share). */
  hexPaid: number;
  /** Hex burned from the dumper (proportional to discount, capped). */
  hexBurned: number;
  /** Unix ms when the rescue closed. */
  rescuedAt: number;
};

export type DumpLedgerEntry = {
  tokenId: number;
  dumper: string;
  rescuer: string | null;        // null if delisted before sale
  priceEth: number;
  floorEth: number;
  discount: number;              // 0.20 = 20% under floor
  ts: number;
};

const memory = {
  ghosts: new Map<number, GhostRecord>(),
  rescues: new Map<number, RescueRecord>(),
  dumps: [] as DumpLedgerEntry[],
  defenders: new Map<string, number>(),
};

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY_GHOST = (t: number) => `freelon:ghost:v1:${t}`;
const KEY_GHOST_IDX = "freelon:ghost:idx";
const KEY_RESCUE = (t: number) => `freelon:ghost:rescued:${t}`;
const KEY_DUMPS_IDX = "freelon:ghost:dumps:idx";
const KEY_DUMP_ENTRY = (id: string) => `freelon:ghost:dumps:${id}`;
const KEY_DEFENDER = (w: string) => `freelon:ghost:defender:${w.toLowerCase()}`;

const GHOST_TTL_SEC = 60 * 86400;   // 60 days
const RESCUE_TTL_SEC = 365 * 86400; // 1 year of rescue history

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

// ─── Ghost CRUD ──────────────────────────────────────────────────────

export async function getGhost(tokenId: number): Promise<GhostRecord | null> {
  if (!hasUpstash) return memory.ghosts.get(tokenId) ?? null;
  try {
    const raw = (await upstash(["GET", KEY_GHOST(tokenId)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as GhostRecord;
  } catch {
    return null;
  }
}

export async function setGhost(rec: GhostRecord): Promise<void> {
  if (!hasUpstash) {
    memory.ghosts.set(rec.tokenId, rec);
    return;
  }
  await Promise.all([
    upstash(["SETEX", KEY_GHOST(rec.tokenId), String(GHOST_TTL_SEC), JSON.stringify(rec)]),
    upstash(["ZADD", KEY_GHOST_IDX, String(rec.ghostedAt || rec.firstSeenAt), String(rec.tokenId)]),
  ]);
}

export async function clearGhost(tokenId: number): Promise<void> {
  if (!hasUpstash) {
    memory.ghosts.delete(tokenId);
    return;
  }
  await Promise.all([
    upstash(["DEL", KEY_GHOST(tokenId)]),
    upstash(["ZREM", KEY_GHOST_IDX, String(tokenId)]),
  ]);
}

/** Cheap bulk fetch of all currently-ghosted token ids. Used by the
 *  ghost detector + the public ledger page. */
export async function listGhostedIds(limit = 200): Promise<number[]> {
  if (!hasUpstash) {
    return [...memory.ghosts.keys()]
      .filter((id) => memory.ghosts.get(id)?.status === "ghosted")
      .slice(0, limit);
  }
  try {
    const raws = (await upstash(["ZRANGE", KEY_GHOST_IDX, "0", String(limit - 1)])) as string[] | null;
    return (raws || []).map((x) => Number(x)).filter(Number.isFinite);
  } catch {
    return [];
  }
}

// ─── Rescue records ──────────────────────────────────────────────────

export async function getRescue(tokenId: number): Promise<RescueRecord | null> {
  if (!hasUpstash) return memory.rescues.get(tokenId) ?? null;
  try {
    const raw = (await upstash(["GET", KEY_RESCUE(tokenId)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as RescueRecord;
  } catch {
    return null;
  }
}

export async function recordRescue(rec: RescueRecord): Promise<void> {
  if (!hasUpstash) {
    memory.rescues.set(rec.tokenId, rec);
    return;
  }
  await upstash(["SETEX", KEY_RESCUE(rec.tokenId), String(RESCUE_TTL_SEC), JSON.stringify(rec)]);
}

// ─── Dump ledger (public history) ────────────────────────────────────

export async function appendDumpEntry(entry: DumpLedgerEntry): Promise<void> {
  if (!hasUpstash) {
    memory.dumps.unshift(entry);
    memory.dumps = memory.dumps.slice(0, 500);
    return;
  }
  const id = `${entry.tokenId}-${entry.ts}`;
  await Promise.all([
    upstash(["SETEX", KEY_DUMP_ENTRY(id), String(RESCUE_TTL_SEC), JSON.stringify(entry)]),
    upstash(["ZADD", KEY_DUMPS_IDX, String(entry.ts), id]),
  ]);
}

export async function listDumpLedger(limit = 50): Promise<DumpLedgerEntry[]> {
  if (!hasUpstash) return memory.dumps.slice(0, limit);
  try {
    const ids = (await upstash(["ZREVRANGE", KEY_DUMPS_IDX, "0", String(limit - 1)])) as string[] | null;
    if (!ids || ids.length === 0) return [];
    const raws = (await upstash(["MGET", ...ids.map(KEY_DUMP_ENTRY)])) as (string | null)[];
    const out: DumpLedgerEntry[] = [];
    for (const raw of raws) {
      if (!raw) continue;
      try { out.push(JSON.parse(raw) as DumpLedgerEntry); } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

// ─── DEFENDER streak ─────────────────────────────────────────────────

/** Returns the unix-ms timestamp the wallet has been clean since.
 *  null = never tracked (treat as 0). */
export async function getDefenderSince(wallet: string): Promise<number | null> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) return memory.defenders.get(w) ?? null;
  try {
    const raw = (await upstash(["GET", KEY_DEFENDER(w)])) as string | null;
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/** Idempotent — only sets if the wallet has never been tracked. */
export async function ensureDefenderStarted(wallet: string): Promise<void> {
  const w = wallet.toLowerCase();
  const cur = await getDefenderSince(w);
  if (cur !== null) return;
  const now = Date.now();
  if (!hasUpstash) {
    memory.defenders.set(w, now);
    return;
  }
  try { await upstash(["SET", KEY_DEFENDER(w), String(now)]); } catch {}
}

/** Called when a wallet dumps — resets their defender streak. */
export async function breakDefenderStreak(wallet: string): Promise<void> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) {
    memory.defenders.delete(w);
    return;
  }
  try { await upstash(["DEL", KEY_DEFENDER(w)]); } catch {}
}

/** Compute the wallet's current defender bonus in percent. */
export function defenderBonusPct(since: number | null): number {
  if (!since) return 0;
  const months = Math.floor((Date.now() - since) / (30 * 86400 * 1000));
  const raw = months * ECONOMY.DEFENDER_BONUS_PCT_PER_MONTH;
  return Math.min(raw, ECONOMY.DEFENDER_BONUS_PCT_CAP);
}
