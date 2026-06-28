/**
 * MARS COMMAND — weekly arcade leaderboard (bragging rights only).
 *
 * Closed, non-cashable status board for the single-player Mars game served at
 * /mars (same-origin → no CORS needed). This route NEVER touches ⬡ / HEX, has
 * no auth, mutates no ledger, and pays out nothing — scores are self-reported
 * arcade times. It exists purely so the game can fake a living world (ghost
 * replays) and crown a weekly winner.
 *
 * Mirrors the repo Upstash pattern (lib/upstash-client + globalThis dev Map +
 * weekKeyOf ISO week + lib/rate-limit). Two boards, keyed per ISO week:
 *   - race  : LOWEST time wins  (seconds, smaller = better)
 *   - storm : HIGHEST survival wins (wall metres / survival score, bigger = better)
 *
 * Storage: a Redis sorted set per (board, week). We always store the score so
 * ZRANGE ascending = race winners and ZREVRANGE = storm winners; the entry
 * member is a JSON blob {name,score,meta,t}. Capped to TOP_N members per key
 * (trim on write) so a week's key can't grow unbounded, and each key gets a
 * ~16-day TTL so old weeks self-expire.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";
import { weekKeyOf } from "@/lib/carrier-of-week";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Board = "race" | "storm";
const BOARDS: readonly Board[] = ["race", "storm"];
const TOP_N = 25;
const KEY_TTL = 16 * 24 * 60 * 60; // ~16d → a week's key outlives "last week" reads, then expires
const NAME_MAX = 18;
const META_MAX = 80;

type Entry = { name: string; score: number; meta: string; t: number };

const zkey = (board: Board, week: string) => `freelon:mars:lb:${board}:${week}`;

// "higher is better" for storm, "lower is better" for race.
const isDesc = (board: Board) => board === "storm";

// DEV fallback (no Upstash). globalThis-backed so it survives Next's per-route
// dev module reloads. Prod always has hasUpstash === true.
type Mem = Map<string, Entry[]>;
const g = globalThis as unknown as { __marsLbMem?: Mem };
const mem: Mem = g.__marsLbMem ?? (g.__marsLbMem = new Map());

function prevWeekKey(now: Date): string {
  return weekKeyOf(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
}

function sanitizeName(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  // strip control chars + angle brackets (defence-in-depth; the game coerces too)
  s = s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, NAME_MAX);
  return s || "ANON ROVER";
}

function sanitizeMeta(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  return s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, META_MAX);
}

function sortEntries(board: Board, rows: Entry[]): Entry[] {
  const desc = isDesc(board);
  return rows.slice().sort((a, b) => (desc ? b.score - a.score : a.score - b.score));
}

async function readBoard(board: Board, week: string): Promise<Entry[]> {
  if (!hasUpstash) {
    return sortEntries(board, mem.get(zkey(board, week)) ?? []).slice(0, TOP_N);
  }
  // store -score for storm so a single ascending ZRANGE always yields winners-first
  const raw = await upstash(["ZRANGE", zkey(board, week), "0", String(TOP_N - 1)]).catch(() => []);
  const arr = Array.isArray(raw) ? (raw as string[]) : [];
  const out: Entry[] = [];
  for (const m of arr) {
    try {
      const e = JSON.parse(m) as Entry;
      if (e && typeof e.score === "number") out.push(e);
    } catch {
      /* skip corrupt member */
    }
  }
  return out;
}

async function writeScore(board: Board, week: string, entry: Entry): Promise<void> {
  const member = JSON.stringify(entry);
  const rankScore = isDesc(board) ? -entry.score : entry.score; // ascending ZRANGE = winners first
  if (!hasUpstash) {
    const key = zkey(board, week);
    const list = mem.get(key) ?? mem.set(key, []).get(key)!;
    list.push(entry);
    const trimmed = sortEntries(board, list).slice(0, TOP_N);
    mem.set(key, trimmed);
    return;
  }
  const key = zkey(board, week);
  await upstash(["ZADD", key, String(rankScore), member]).catch(() => {});
  // trim to TOP_N (drop the worst-ranked = highest index in ascending order) + TTL
  await upstash(["ZREMRANGEBYRANK", key, String(TOP_N), "-1"]).catch(() => {});
  await upstash(["EXPIRE", key, String(KEY_TTL)]).catch(() => {});
}

/**
 * POST /api/mars/leaderboard
 * body: { board:'race'|'storm', name, score, meta? }
 * No auth. Closed bragging-rights board — never credits ⬡.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "mars-lb-post", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const board = b.board as Board;
  if (!BOARDS.includes(board)) {
    return NextResponse.json({ error: "board must be race|storm" }, { status: 400 });
  }
  const score = Number(b.score);
  // clamp to a sane arcade range; reject NaN/inf/negative/absurd
  if (!Number.isFinite(score) || score < 0 || score > 1_000_000) {
    return NextResponse.json({ error: "invalid score" }, { status: 400 });
  }

  const entry: Entry = {
    name: sanitizeName(b.name),
    score: Math.round(score * 100) / 100,
    meta: sanitizeMeta(b.meta),
    t: Date.now(),
  };
  const week = weekKeyOf(new Date());
  await writeScore(board, week, entry);

  const top = await readBoard(board, week);
  return NextResponse.json({ ok: true, board, week, rank: top.findIndex((e) => e.t === entry.t) + 1 || null });
}

/**
 * GET /api/mars/leaderboard?board=race|storm&limit=N
 * Returns this week's top-N + last week's winner (top entry of the PREVIOUS week).
 * Public read; same-origin game UI + ghost-replay source.
 */
export async function GET(req: Request) {
  const rl = await limit(req, "mars-lb-get", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const board = (url.searchParams.get("board") || "race") as Board;
  if (!BOARDS.includes(board)) {
    return NextResponse.json({ error: "board must be race|storm" }, { status: 400 });
  }
  const limitN = Math.min(TOP_N, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

  const now = new Date();
  const week = weekKeyOf(now);
  const top = (await readBoard(board, week)).slice(0, limitN);
  const lastWeek = prevWeekKey(now);
  const prevTop = await readBoard(board, lastWeek);
  const winner = prevTop[0] ?? null; // already winners-first

  return NextResponse.json(
    {
      board,
      week,
      lower_is_better: !isDesc(board),
      count: top.length,
      top,
      lastWeek: { week: lastWeek, winner },
    },
    {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    },
  );
}
