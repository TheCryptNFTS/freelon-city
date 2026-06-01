/**
 * Authoritative Crypt match store.
 *
 * Mirrors lib/wallet-hex-store.ts in transport style EXACTLY: raw Upstash REST
 * via `upstash(["SET", key, JSON.stringify(rec)])` / `["GET", key]`, with an
 * in-memory `Map` fallback gated on `hasUpstash` for dev. Match keys carry a
 * TTL so abandoned matches expire on their own.
 *
 * The store holds the FULL authoritative MatchState (including `seed` and both
 * decks) — this is the trusted server copy and is NEVER returned to a client
 * directly. Routes redact it through `redactStateFor` before responding.
 *
 * Optimistic concurrency: every record carries a monotonically increasing
 * `version`, bumped on each successful write. `setMatch` takes an optional
 * `expectedVersion`; if the stored version no longer matches, the write is
 * rejected (returns `{ ok: false, conflict: true }`) so the caller can answer
 * 409 instead of clobbering a concurrent move.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";
import type { MatchState, PlayerId } from "@/lib/crypt-engine/engine/state";

/** Persisted match record: authoritative state + concurrency version. */
export type MatchRecord = {
  matchId: string;
  /** Bumped on every successful write. Used for optimistic concurrency. */
  version: number;
  /** Full authoritative state — includes seed + both decks. Server-only. */
  state: MatchState;
  /**
   * Seat -> wallet address (lowercased). P1 is the creator/host; P2 is the
   * joiner (null until someone joins / is matched). Seat ownership is the
   * server's identity binding: a Bearer's address must equal the seat's
   * address for any action it submits.
   */
  players: { P1: string; P2: string | null };
  /** Short code a host shares so a friend can join this match directly. */
  joinCode: string;
  /**
   * Wall-clock deadline (ms) for the CURRENT turn. Updated on every successful
   * write. Used by the lazy-forfeit guard + cron sweep to time out an absent
   * player.
   */
  turnDeadline: number;
  createdAt: number;
  updatedAt: number;
};

/**
 * Map a wallet address to its seat in a match, or null if the address holds no
 * seat. Lowercase-insensitive. This is the authority check: only the seated
 * wallet may act for that seat.
 */
export function seatOf(record: MatchRecord, address: string): PlayerId | null {
  const a = (address || "").toLowerCase();
  if (!a) return null;
  if (record.players?.P1 && record.players.P1.toLowerCase() === a) return "P1";
  if (record.players?.P2 && record.players.P2.toLowerCase() === a) return "P2";
  return null;
}

/** Matches live for 24h of inactivity before Upstash evicts them. */
const TTL_SECONDS = 60 * 60 * 24;

const memory = new Map<string, MatchRecord>();
/** Dev-fallback join-code -> matchId index (mirrors the Upstash CODE_KEY). */
const codeMemory = new Map<string, string>();

const KEY = (id: string) => `freelon:match:v1:${id}`;
/**
 * Join-code -> matchId index. A host shares the short `joinCode`, not the long
 * internal matchId, so the join route resolves a code to its match through this
 * index. Codes are uppercased to match `match-pvp`'s generator alphabet.
 */
const CODE_KEY = (code: string) => `freelon:matchcode:v1:${code.toUpperCase()}`;

export type SetResult =
  | { ok: true; record: MatchRecord }
  | { ok: false; conflict: true; current: MatchRecord | null };

export async function getMatch(id: string): Promise<MatchRecord | null> {
  if (!hasUpstash) return memory.get(id) ?? null;
  try {
    const raw = (await upstash(["GET", KEY(id)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as MatchRecord;
  } catch {
    return null;
  }
}

/** Persist a brand-new match. Caller supplies version 1 (or we default it). */
export async function createMatch(record: MatchRecord): Promise<MatchRecord> {
  const rec: MatchRecord = {
    ...record,
    version: record.version || 1,
    createdAt: record.createdAt || record.updatedAt,
  };
  await write(rec);
  await writeCodeIndex(rec.joinCode, rec.matchId);
  return rec;
}

/**
 * Resolve a host-shared join code to its matchId, or null if no live match
 * carries that code. The join route uses this so a friend who only has the
 * short code (not the internal matchId) can still reach the right match.
 */
export async function getMatchIdByJoinCode(code: string): Promise<string | null> {
  const c = (code || "").trim();
  if (!c) return null;
  if (!hasUpstash) return codeMemory.get(c.toUpperCase()) ?? null;
  try {
    return ((await upstash(["GET", CODE_KEY(c)])) as string | null) ?? null;
  } catch {
    return null;
  }
}

async function writeCodeIndex(code: string, matchId: string): Promise<void> {
  if (!code) return;
  if (!hasUpstash) {
    codeMemory.set(code.toUpperCase(), matchId);
    return;
  }
  await upstash(["SET", CODE_KEY(code), matchId, "EX", String(TTL_SECONDS)]);
}

/**
 * Persist an updated match. When `expectedVersion` is supplied, the write only
 * lands if the currently-stored version still equals it — otherwise a
 * concurrent action already advanced the match and we reject so the caller can
 * return 409 Conflict. On success the stored version is bumped by 1.
 *
 * NOTE: this is optimistic, not transactional. Upstash REST has no MULTI/WATCH
 * here, so a true race between two GET+SET pairs is theoretically possible. For
 * a turn-based, single-active-player game (the reducer rejects out-of-turn
 * actions anyway) this version check is sufficient. TODO(M2): if real PvP
 * concurrency becomes contended, move to a Lua/`SET ... NX`-style CAS.
 */
export async function setMatch(
  id: string,
  record: MatchRecord,
  expectedVersion?: number,
): Promise<SetResult> {
  if (expectedVersion !== undefined) {
    const current = await getMatch(id);
    if (!current || current.version !== expectedVersion) {
      return { ok: false, conflict: true, current };
    }
  }
  const rec: MatchRecord = {
    ...record,
    matchId: id,
    version: (expectedVersion ?? record.version) + 1,
    updatedAt: Date.now(),
  };
  await write(rec);
  return { ok: true, record: rec };
}

/**
 * Enumerate live match records for the cron sweep backstop. SCANs the
 * `freelon:match:v1:*` keyspace (Upstash REST), capped + budgeted so a busy
 * instance can't blow the function timeout. In dev (no Upstash) returns the
 * in-memory map's values. Mirrors listWalletHexRecords' SCAN style.
 */
export async function listMatchRecords(max = 500): Promise<MatchRecord[]> {
  if (!hasUpstash) return Array.from(memory.values()).slice(0, max);
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    const pattern = "freelon:match:v1:*";
    const keys: string[] = [];
    let cursor = "0";
    let pages = 0;
    const startedAt = Date.now();
    const HARD_BUDGET_MS = 5000;
    do {
      if (Date.now() - startedAt > HARD_BUDGET_MS) break;
      const res = await fetch(
        `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/1000`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (!res.ok) break;
      const j = (await res.json()) as { result: [string, string[]] };
      cursor = j.result[0];
      for (const k of j.result[1]) keys.push(k);
      pages++;
      if (keys.length >= max || pages > 10) break;
    } while (cursor !== "0");

    if (keys.length === 0) return [];
    const mgetUrl = `${url}/MGET/${keys.map((k) => encodeURIComponent(k)).join("/")}`;
    const mr = await fetch(mgetUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!mr.ok) return [];
    const mj = (await mr.json()) as { result: (string | null)[] };
    const out: MatchRecord[] = [];
    for (const raw of mj.result) {
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw) as MatchRecord);
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

async function write(rec: MatchRecord): Promise<void> {
  if (!hasUpstash) {
    memory.set(rec.matchId, rec);
    return;
  }
  // SET with EX for a sliding TTL (refreshed on every write).
  await upstash([
    "SET",
    KEY(rec.matchId),
    JSON.stringify(rec),
    "EX",
    String(TTL_SECONDS),
  ]);
}
