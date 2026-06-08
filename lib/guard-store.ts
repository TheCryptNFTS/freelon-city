/**
 * GUARD THE POT store — the isolated ledger for the adversarial spectacle.
 *
 * ECONOMY ISOLATION (locked rule, same as reckoning-store): the ONLY ⬡ movement
 * in Guard the Pot is a DEBIT (burn) performed by the attempt route. This module
 * holds NO ⬡ and credits NO ⬡ to anyone — it only tracks round state, the public
 * attempt board, and the winner. `totalBurned` mirrors what the route burned, for
 * display. The PRIZE is external (founder ETH / non-money grant), never ⬡.
 *
 * Upstash REST in prod; in-memory Maps in dev (same pattern as the other stores).
 *
 *   freelon:guard:v1:round              → GuardRound        (the live round, public-safe)
 *   freelon:guard:v1:secret:<n>         → string            (release token — SERVER ONLY)
 *   freelon:guard:v1:board:<n>          → GuardAttempt[]     (recent attempts, capped)
 *   freelon:guard:v1:winlock:<n>        → addr (SET NX)      (atomic single-winner claim)
 *   freelon:guard:v1:daily:<day>:<addr> → INCR counter       (per-wallet daily attempts)
 *   freelon:guard:v1:dayall:<day>       → INCR counter       (global daily attempts)
 */
import crypto from "node:crypto";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { GUARD_POT, guardPotFee } from "@/lib/economy-constants";

const NS = "freelon:guard:v1";
const ROUND_KEY = `${NS}:round`;
const SECRET_KEY = (n: number) => `${NS}:secret:${n}`;
const BOARD_KEY = (n: number) => `${NS}:board:${n}`;
const WINLOCK_KEY = (n: number) => `${NS}:winlock:${n}`;
const DAILY_WALLET_KEY = (day: string, addr: string) => `${NS}:daily:${day}:${addr.toLowerCase()}`;
const DAILY_GLOBAL_KEY = (day: string) => `${NS}:dayall:${day}`;

const BOARD_CAP = 50;
const DAILY_TTL = 93_600; // ~26h, so a UTC-day counter self-expires

export type GuardRound = {
  round: number;
  status: "open" | "won";
  attempts: number;
  totalBurned: number; // ⬡ burned this round (display mirror — NOT a balance)
  fee: number; // ⬡ fee for the NEXT attempt
  prizeLabel: string; // external prize, display only (e.g. "0.25 ETH") — never ⬡
  openedAt: number;
  winner: string | null;
  winnerAt: number | null;
  winningAttempt: number | null;
};

export type GuardAttempt = {
  addr: string; // masked on the public board by the route, stored full here
  snippet: string; // short, sanitized excerpt of the message
  fee: number;
  at: number;
  won: boolean;
};

const mem = new Map<string, string>();
const memCount = new Map<string, number>();
const memLock = new Set<string>();

async function getJSON<T>(key: string): Promise<T | null> {
  if (!hasUpstash) {
    const raw = mem.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  try {
    const raw = (await upstash(["GET", key])) as string | null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  if (!hasUpstash) {
    mem.set(key, raw);
    return;
  }
  await upstash(["SET", key, raw]);
}

function prizeLabelFromEnv(): string {
  return process.env.GUARD_POT_PRIZE_LABEL || "TBA";
}

/** The live round. Creates round 1 (open) on first touch. Never returns the secret. */
export async function getRound(): Promise<GuardRound> {
  const existing = await getJSON<GuardRound>(ROUND_KEY);
  if (existing) {
    // Keep the prize label in sync with env without resetting the round.
    const label = prizeLabelFromEnv();
    if (existing.prizeLabel !== label) {
      existing.prizeLabel = label;
      await setJSON(ROUND_KEY, existing);
    }
    return existing;
  }
  const fresh: GuardRound = {
    round: 1,
    status: "open",
    attempts: 0,
    totalBurned: 0,
    fee: guardPotFee(0),
    prizeLabel: prizeLabelFromEnv(),
    openedAt: Date.now(),
    winner: null,
    winnerAt: null,
    winningAttempt: null,
  };
  await setJSON(ROUND_KEY, fresh);
  return fresh;
}

/**
 * The release token for a round — SERVER ONLY. High-entropy; injected into the
 * guard agent's system prompt as the thing it must never output unless genuinely
 * convinced. A win = the model emits this exact token. Generated + persisted once
 * per round; the in-memory dev path keeps it stable across calls too.
 */
export async function getSecret(round: number): Promise<string> {
  const key = SECRET_KEY(round);
  const existing = await getJSON<string>(key);
  if (existing) return existing;
  const token = `RELEASE-${crypto.randomBytes(9).toString("hex").toUpperCase()}`;
  await setJSON(key, token);
  return token;
}

// ── daily caps (INCR counters, self-expiring) ───────────────────────────────

export function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Peek today's attempt counts WITHOUT incrementing (for the pre-charge cap check). */
export async function getDailyCounts(addr: string): Promise<{ wallet: number; global: number }> {
  const day = utcDay();
  if (!hasUpstash) {
    return {
      wallet: memCount.get(DAILY_WALLET_KEY(day, addr)) ?? 0,
      global: memCount.get(DAILY_GLOBAL_KEY(day)) ?? 0,
    };
  }
  try {
    const [w, g] = (await Promise.all([
      upstash(["GET", DAILY_WALLET_KEY(day, addr)]),
      upstash(["GET", DAILY_GLOBAL_KEY(day)]),
    ])) as (string | null)[];
    return { wallet: parseInt(w || "0", 10) || 0, global: parseInt(g || "0", 10) || 0 };
  } catch {
    return { wallet: 0, global: 0 };
  }
}

/** Count one real (charged) attempt against both daily counters. */
export async function incrDaily(addr: string): Promise<void> {
  const day = utcDay();
  const wKey = DAILY_WALLET_KEY(day, addr);
  const gKey = DAILY_GLOBAL_KEY(day);
  if (!hasUpstash) {
    memCount.set(wKey, (memCount.get(wKey) ?? 0) + 1);
    memCount.set(gKey, (memCount.get(gKey) ?? 0) + 1);
    return;
  }
  try {
    await upstash(["INCR", wKey]);
    await upstash(["EXPIRE", wKey, String(DAILY_TTL)]);
    await upstash(["INCR", gKey]);
    await upstash(["EXPIRE", gKey, String(DAILY_TTL)]);
  } catch {
    /* counters are best-effort guards; never block the (already-burned) attempt */
  }
}

// ── attempt recording ───────────────────────────────────────────────────────

async function pushBoard(round: number, entry: GuardAttempt): Promise<void> {
  const key = BOARD_KEY(round);
  const list = (await getJSON<GuardAttempt[]>(key)) ?? [];
  list.unshift(entry);
  if (list.length > BOARD_CAP) list.length = BOARD_CAP;
  await setJSON(key, list);
}

export async function getBoard(round: number, limit = BOARD_CAP): Promise<GuardAttempt[]> {
  const list = (await getJSON<GuardAttempt[]>(BOARD_KEY(round))) ?? [];
  return list.slice(0, limit);
}

/** Atomically claim the single winner slot for a round. Returns true exactly once. */
async function claimWinner(round: number, addr: string): Promise<boolean> {
  const key = WINLOCK_KEY(round);
  if (!hasUpstash) {
    if (memLock.has(key)) return false;
    memLock.add(key);
    return true;
  }
  try {
    const res = (await upstash(["SET", key, addr.toLowerCase(), "NX"])) as string | null;
    return res === "OK";
  } catch {
    return false;
  }
}

export type AttemptOutcome = "denied" | "won" | "already_won";

/**
 * Record one CHARGED attempt (the burn already happened in the route). Advances
 * the round counters + fee, appends to the public board, and — if `won` — claims
 * the single winner slot atomically. Read-modify-write (same non-atomic pattern
 * as reckoning-store; acceptable at this scale). The winner lock is the one piece
 * that IS atomic, so two simultaneous "wins" can't both pay out.
 */
export async function recordAttempt(input: {
  round: number;
  addr: string;
  snippet: string;
  fee: number;
  won: boolean;
}): Promise<{ round: GuardRound; outcome: AttemptOutcome }> {
  const round = await getRound();
  // Stale round / already decided → treat as already_won (route should have caught it).
  if (round.round !== input.round || round.status === "won") {
    await pushBoard(round.round, {
      addr: input.addr.toLowerCase(),
      snippet: input.snippet,
      fee: input.fee,
      at: Date.now(),
      won: false,
    });
    round.attempts += 1;
    round.totalBurned += input.fee;
    round.fee = guardPotFee(round.attempts);
    await setJSON(ROUND_KEY, round);
    return { round, outcome: "already_won" };
  }

  let outcome: AttemptOutcome = "denied";
  if (input.won) {
    const claimed = await claimWinner(round.round, input.addr);
    if (claimed) {
      outcome = "won";
      round.status = "won";
      round.winner = input.addr.toLowerCase();
      round.winnerAt = Date.now();
      round.winningAttempt = round.attempts + 1;
    } else {
      outcome = "already_won";
    }
  }

  round.attempts += 1;
  round.totalBurned += input.fee;
  round.fee = guardPotFee(round.attempts);

  await pushBoard(round.round, {
    addr: input.addr.toLowerCase(),
    snippet: input.snippet,
    fee: input.fee,
    at: Date.now(),
    won: outcome === "won",
  });
  await setJSON(ROUND_KEY, round);
  return { round, outcome };
}
