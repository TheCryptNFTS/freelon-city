/**
 * Reply ledger — tracks carrier replies to @4040hex posts for the
 * reply economy.
 *
 * Why this exists:
 *   X algorithm weighs replies ~270× a like. We need the carrier
 *   base hitting @4040hex posts with replies in the first 30 min
 *   to ride velocity. To pay for that, we need to know who replied
 *   to what, and which replies earned engagement.
 *
 * Storage:
 *   freelon:reply:v1:<replyId>           → ReplyRecord JSON
 *   freelon:reply:byday:<wallet>:<day>   → counter (REPLY_DAILY_CAP)
 *   freelon:reply:byparent:<parentId>    → ZSET of replyIds (score = ts)
 *   freelon:reply:pending-eng-scan       → ZSET of replyIds awaiting
 *                                          engagement check (score = scanAt)
 *
 * The autopost layer (lib/x-autopost) records every @4040hex tweet
 * it sends into freelon:autopost:parent-tweets so the reply route
 * can validate that submitted reply targets actually came from us.
 */

export type ReplyRecord = {
  /** X tweet id of the carrier's reply. */
  replyId: string;
  /** X tweet id of the @4040hex post being replied to. */
  parentId: string;
  /** Carrier's wallet (lowercased). */
  wallet: string;
  /** Carrier's X handle (lowercased, no @). */
  xHandle: string;
  /** Unix ms when the reply landed in our ledger. */
  ts: number;
  /** True when this reply landed inside REPLY_BURST_WINDOW_MIN of the
   *  parent post AND was among the first REPLY_BURST_FIRST_N. */
  burstWinner: boolean;
  /** Hex paid out for the base reply (including burst multiplier). */
  basePaid: number;
  /** Engagement bonus paid (set by the 24h cron scan). 0 until scanned. */
  bonusPaid: number;
  /** Whether the engagement scan has completed for this reply. */
  bonusScanned: boolean;
  /** Like count at scan time (informational). */
  likesAtScan?: number;
};

const memory = {
  byId: new Map<string, ReplyRecord>(),
  byDay: new Map<string, number>(),         // <wallet>:<day> → counter
  byParent: new Map<string, Set<string>>(), // parentId → Set<replyId>
  parentTweets: new Set<string>(),
};

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY_REPLY = (id: string) => `freelon:reply:v1:${id}`;
const KEY_DAY = (w: string, d: string) => `freelon:reply:byday:${w.toLowerCase()}:${d}`;
const KEY_PARENT = (id: string) => `freelon:reply:byparent:${id}`;
const KEY_PENDING_SCAN = "freelon:reply:pending-eng-scan";
const KEY_PARENT_INDEX = "freelon:autopost:parent-tweets";

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

function todayUTC(): string { return new Date().toISOString().slice(0, 10); }

/** Called by lib/x-autopost.postTweet after a successful @4040hex post,
 *  so the reply route can validate parent IDs. 30-day TTL. */
export async function rememberAutopostTweet(tweetId: string): Promise<void> {
  if (!tweetId) return;
  if (!hasUpstash) { memory.parentTweets.add(tweetId); return; }
  try {
    await upstash(["ZADD", KEY_PARENT_INDEX, String(Date.now()), tweetId]);
    // Keep ZSET bounded (rough TTL — old entries auto-trim)
    await upstash(["ZREMRANGEBYSCORE", KEY_PARENT_INDEX, "0", String(Date.now() - 30 * 86400_000)]);
  } catch {/* non-fatal */}
}

/** Returns true if `tweetId` is one we autoposted in the last 30 days. */
export async function isAutopostedTweet(tweetId: string): Promise<boolean> {
  if (!tweetId) return false;
  if (!hasUpstash) return memory.parentTweets.has(tweetId);
  try {
    const score = (await upstash(["ZSCORE", KEY_PARENT_INDEX, tweetId])) as string | null;
    return !!score;
  } catch {
    return false;
  }
}

/** How many @4040hex tweet IDs are known. Used by the validation path
 *  to decide whether to allow a reply at all (no parents = no replies). */
export async function knownAutopostedCount(): Promise<number> {
  if (!hasUpstash) return memory.parentTweets.size;
  try {
    const n = await upstash(["ZCARD", KEY_PARENT_INDEX]);
    return Number(n) || 0;
  } catch { return 0; }
}

/** Returns the autopost tweet timestamp (the score in the ZSET) in ms,
 *  or null if not found. Used by the reply route to compute whether the
 *  carrier's reply is within the burst window. */
export async function parentPostedAt(tweetId: string): Promise<number | null> {
  if (!hasUpstash) return null;
  try {
    const score = (await upstash(["ZSCORE", KEY_PARENT_INDEX, tweetId])) as string | null;
    if (!score) return null;
    const n = Number(score);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

/** Returns the count of replies already credited against this parent. */
export async function replyCountForParent(parentId: string): Promise<number> {
  if (!hasUpstash) return memory.byParent.get(parentId)?.size ?? 0;
  try {
    const n = await upstash(["ZCARD", KEY_PARENT(parentId)]);
    return Number(n) || 0;
  } catch { return 0; }
}

/** Returns how many paid replies the wallet has logged today. */
export async function dailyReplyCount(wallet: string, day = todayUTC()): Promise<number> {
  if (!hasUpstash) return memory.byDay.get(`${wallet}:${day}`) ?? 0;
  try {
    const n = await upstash(["GET", KEY_DAY(wallet, day)]);
    return Number(n) || 0;
  } catch { return 0; }
}

export async function getReply(replyId: string): Promise<ReplyRecord | null> {
  if (!hasUpstash) return memory.byId.get(replyId) ?? null;
  try {
    const raw = (await upstash(["GET", KEY_REPLY(replyId)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as ReplyRecord;
  } catch { return null; }
}

export async function recordReply(rec: ReplyRecord): Promise<void> {
  const day = todayUTC();
  if (!hasUpstash) {
    memory.byId.set(rec.replyId, rec);
    const dk = `${rec.wallet}:${day}`;
    memory.byDay.set(dk, (memory.byDay.get(dk) ?? 0) + 1);
    const set = memory.byParent.get(rec.parentId) ?? new Set<string>();
    set.add(rec.replyId);
    memory.byParent.set(rec.parentId, set);
    return;
  }
  // 30-day TTL on the record; 48h TTL on the daily counter (covers streak math)
  await Promise.all([
    upstash(["SETEX", KEY_REPLY(rec.replyId), String(30 * 86400), JSON.stringify(rec)]),
    upstash(["INCR", KEY_DAY(rec.wallet, day)]),
    upstash(["EXPIRE", KEY_DAY(rec.wallet, day), String(48 * 3600)]),
    upstash(["ZADD", KEY_PARENT(rec.parentId), String(rec.ts), rec.replyId]),
    // Schedule the engagement scan for 24h after the reply landed
    upstash(["ZADD", KEY_PENDING_SCAN, String(rec.ts + 24 * 3600_000), rec.replyId]),
  ]);
}

export async function updateReply(rec: ReplyRecord): Promise<void> {
  if (!hasUpstash) { memory.byId.set(rec.replyId, rec); return; }
  try { await upstash(["SETEX", KEY_REPLY(rec.replyId), String(30 * 86400), JSON.stringify(rec)]); } catch {}
}

/** Returns reply IDs due for engagement scanning (scanAt <= now), max 50. */
export async function listPendingEngagementScans(now = Date.now()): Promise<string[]> {
  if (!hasUpstash) return [];
  try {
    const raws = (await upstash(["ZRANGEBYSCORE", KEY_PENDING_SCAN, "0", String(now), "LIMIT", "0", "50"])) as string[] | null;
    return raws || [];
  } catch { return []; }
}

export async function clearPendingScan(replyId: string): Promise<void> {
  if (!hasUpstash) return;
  try { await upstash(["ZREM", KEY_PENDING_SCAN, replyId]); } catch {}
}
