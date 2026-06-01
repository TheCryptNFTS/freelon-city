/**
 * Shared PvP match helpers used by the create / queue / join / GET / action
 * routes. Keeps seat-aware match construction, the join-code generator, and the
 * lazy-forfeit rule in one place so every route applies them identically.
 *
 * NO hex/ledger authority lives here — matches are pure game state.
 */

import { randomBytes } from "node:crypto";
import type { MatchRecord } from "@/lib/match-store";
import { seatOf } from "@/lib/match-store";
import { createMatchFromDecks } from "@/lib/crypt-engine/engine/createMatchFromDecks";
import { demoSides } from "@/lib/crypt-demo-decks";
import type { MatchState, PlayerId } from "@/lib/crypt-engine/engine/state";

/** A turn must be taken within this window or the absent player can be forfeited. */
export const TURN_MS = 2 * 60 * 1000; // 2 minutes
/**
 * Hard idle window for the cron backstop: a match untouched this long is swept
 * even if nobody hit it via the lazy path. Generous so live games are never
 * killed mid-think.
 */
export const HARD_IDLE_MS = 30 * 60 * 1000; // 30 minutes

/** Cryptographically-strong 32-bit unsigned seed (engine RNG is mulberry32). */
export function generateSeed(): number {
  return randomBytes(4).readUInt32BE(0);
}

export function newMatchId(): string {
  return randomBytes(12).toString("hex");
}

/** Short, human-shareable join code (uppercase, no ambiguous chars). */
export function newJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

/**
 * Build a brand-new MatchRecord seating `p1Addr` as P1 (and optionally `p2Addr`
 * as P2). Generates the seed server-side and bootstraps the authoritative
 * state from demo decks. Returns the unsaved record (caller persists).
 */
export function buildMatchRecord(p1Addr: string, p2Addr: string | null): MatchRecord {
  const seed = generateSeed();
  const { p1, p2 } = demoSides();
  const state = createMatchFromDecks({ p1, p2, seed, shuffle: true }) as MatchState;
  const now = Date.now();
  return {
    matchId: newMatchId(),
    version: 1,
    state,
    players: { P1: p1Addr.toLowerCase(), P2: p2Addr ? p2Addr.toLowerCase() : null },
    joinCode: newJoinCode(),
    turnDeadline: now + TURN_MS,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Lazy forfeit: if the current turn's deadline has passed AND the player whose
 * turn it is, is the OTHER (absent) player relative to `caller`, award the win
 * to the present caller. Mutates a CLONE of the state and returns it plus
 * whether a forfeit was applied. The reducer is not involved — this is a
 * server-side timeout, not a game move.
 *
 * Only fires when the match is still live (no winner) and the match has two
 * seated players (a solo waiting match can't time out an absent opponent).
 */
export function applyLazyForfeit(
  record: MatchRecord,
  callerSeat: PlayerId,
  now = Date.now(),
): { state: MatchState; forfeited: boolean } {
  const st = record.state;
  if (st.winner) return { state: st, forfeited: false };
  if (!record.players.P2) return { state: st, forfeited: false };
  if (now <= record.turnDeadline) return { state: st, forfeited: false };
  // Only the PRESENT player benefits, and only when it's the ABSENT player's
  // turn (i.e. the opponent failed to move in time).
  if (st.activePlayer === callerSeat) return { state: st, forfeited: false };
  const next = structuredClone(st) as MatchState;
  next.winner = callerSeat;
  return { state: next, forfeited: true };
}

export { seatOf };
