/**
 * Arcade high-score leaderboard. Pure score-keeping — NO hex, NO economy.
 * The arcade games (Hex Match etc.) are no-wallet top-of-funnel; this lets a
 * player stamp a run under a typed handle OR their connected wallet so it
 * persists and ranks against everyone else.
 *
 * Storage: one Upstash sorted set per game (member = identity id, score = the
 * player's BEST run via ZADD GT) plus a names hash so we can show the handle
 * casing the player typed. In-memory Map fallback for dev / Upstash outage.
 *
 * Scores arrive from the client and are therefore forgeable (true of any
 * no-wallet JS arcade). We cap + rate-limit at the route to stop casual abuse;
 * this is acquisition fun, not an economy, so that tradeoff is acceptable.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

/** Games allowed to post scores. Add a slug here to enable its board. */
export const ARCADE_GAMES = ["hex-match", "sweep-run"] as const;
export type ArcadeGame = (typeof ARCADE_GAMES)[number];

export function isArcadeGame(g: string): g is ArcadeGame {
  return (ARCADE_GAMES as readonly string[]).includes(g);
}

/** Sane ceiling so a forged POST can't pin the board at MAX_SAFE_INTEGER. */
export const MAX_SCORE = 10_000_000;

const ZKEY = (game: ArcadeGame) => `freelon:arcade:v1:${game}:scores`;
const NKEY = (game: ArcadeGame) => `freelon:arcade:v1:${game}:names`;

const HANDLE_RE = /^[A-Za-z0-9 _.-]{2,20}$/;
export function validHandle(h: string): boolean {
  return typeof h === "string" && h === h.trim() && HANDLE_RE.test(h);
}

export type ScoreEntry = { id: string; handle: string; score: number; rank: number };

/** in-memory fallback: game -> (memberId -> {handle, score}) */
const memory = new Map<ArcadeGame, Map<string, { handle: string; score: number }>>();
function mem(game: ArcadeGame) {
  let m = memory.get(game);
  if (!m) memory.set(game, (m = new Map()));
  return m;
}

/**
 * Identity for a run. A connected wallet wins (canonical, lowercased); else a
 * typed handle. `id` is the stable ZSET member; `handle` is the display label.
 */
export function makeIdentity(opts: { wallet?: string | null; handle?: string | null }): {
  id: string;
  handle: string;
} | null {
  const wallet = opts.wallet?.trim().toLowerCase();
  if (wallet && /^0x[a-f0-9]{40}$/.test(wallet)) {
    const handle = opts.handle && validHandle(opts.handle)
      ? opts.handle.trim()
      : `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
    return { id: `w:${wallet}`, handle };
  }
  const handle = opts.handle?.trim();
  if (handle && validHandle(handle)) {
    return { id: `h:${handle.toLowerCase()}`, handle };
  }
  return null;
}

/**
 * Record a run if it beats the player's existing best. Returns the player's
 * current best (which is `score` if it was an improvement) and their rank.
 */
export async function submitScore(
  game: ArcadeGame,
  id: string,
  handle: string,
  score: number,
): Promise<{ best: number; rank: number }> {
  const clamped = Math.max(0, Math.min(MAX_SCORE, Math.floor(score)));

  if (!hasUpstash) {
    const m = mem(game);
    const prev = m.get(id);
    const best = Math.max(clamped, prev?.score ?? 0);
    m.set(id, { handle, score: best });
    const rank =
      [...m.values()].filter((e) => e.score > best).length + 1;
    return { best, rank };
  }

  // GT keeps only the higher score; XX-less so first run inserts.
  await upstash(["ZADD", ZKEY(game), "GT", String(clamped), id]);
  await upstash(["HSET", NKEY(game), id, handle]);
  const best = Number((await upstash(["ZSCORE", ZKEY(game), id])) ?? clamped);
  // ZREVRANK is 0-based number of members ranked above+equal-or-below; rank is
  // count strictly greater + 1.
  const above = Number(await upstash(["ZCOUNT", ZKEY(game), `(${best}`, "+inf"]));
  return { best, rank: above + 1 };
}

/** Top N runs, highest first. */
export async function topScores(game: ArcadeGame, limit = 20): Promise<ScoreEntry[]> {
  const n = Math.max(1, Math.min(100, limit));

  if (!hasUpstash) {
    const m = mem(game);
    return [...m.entries()]
      .map(([id, e]) => ({ id, handle: e.handle, score: e.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  const flat = (await upstash([
    "ZREVRANGE",
    ZKEY(game),
    "0",
    String(n - 1),
    "WITHSCORES",
  ])) as string[];
  if (!flat || flat.length === 0) return [];

  const ids: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    ids.push(flat[i]);
    scores.push(Number(flat[i + 1]));
  }
  const names = (await upstash(["HMGET", NKEY(game), ...ids])) as (string | null)[];
  return ids.map((id, i) => ({
    id,
    handle: names[i] || id.replace(/^[wh]:/, ""),
    score: scores[i],
    rank: i + 1,
  }));
}
