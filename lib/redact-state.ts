/**
 * redactStateFor — turn the FULL authoritative MatchState into a per-player
 * VIEW that is safe to send to that player's client.
 *
 * SECURITY (the whole reason this file exists): the stored record holds secrets
 * a client must never see:
 *   - `seed` + `rngCursor` — reveal the deterministic RNG stream, so a client
 *     could compute every future draw / shuffle.
 *   - `deck[]` (library order) for BOTH players — reveals exactly which card is
 *     drawn next and the full remaining library.
 *   - the OPPONENT's `hand[]` contents — hidden information.
 *
 * This view INCLUDES (per the security review):
 *   - your own `hand` CONTENTS (card ids)
 *   - BOTH players' boards (units in play are public once on the board)
 *   - BOTH players' `nexusHealth` and `energy` / `maxEnergy`
 *   - your own hand COUNT and deck COUNT
 *   - the opponent's hand COUNT and deck COUNT ONLY (never contents/order)
 *   - public scalar match state: turn, activePlayer, winner
 *
 * It EXCLUDES (proof the secrets never leak): `seed`, `rngCursor`, `idCounter`,
 * every `deck[]` array, the opponent's `hand[]` array, `discard[]` arrays, and
 * per-card commander modifier tables. We build the view by EXPLICITLY copying
 * only the safe fields — never by deleting from a clone — so a newly-added
 * secret field on MatchState can never silently pass through.
 */

import type { MatchState, PlayerId } from "@/lib/crypt-engine/engine/state";

export type RedactedUnit = {
  instanceId: string;
  cardId: string;
  lane: "front" | "back";
  attack: number;
  health: number;
  maxHealth: number;
  speed: number;
  armor: number;
  keywords: string[];
  exhausted: boolean;
  summoningSick: boolean;
};

export type RedactedSelf = {
  id: PlayerId;
  isYou: true;
  commanderId: string;
  nexusHealth: number;
  energy: number;
  maxEnergy: number;
  /** Your own hand is visible to you. */
  hand: string[];
  handCount: number;
  deckCount: number;
  board: { front: RedactedUnit[]; back: RedactedUnit[] };
  artifacts: unknown[];
};

export type RedactedOpponent = {
  id: PlayerId;
  isYou: false;
  commanderId: string;
  nexusHealth: number;
  energy: number;
  maxEnergy: number;
  /** COUNTS ONLY — opponent hand/deck contents are hidden information. */
  handCount: number;
  deckCount: number;
  board: { front: RedactedUnit[]; back: RedactedUnit[] };
  artifacts: unknown[];
};

export type RedactedView = {
  /** Match identifier (echoed for client convenience; not a secret). */
  matchId?: string;
  turn: number;
  activePlayer: PlayerId;
  winner: PlayerId | null;
  /** Which player this view was rendered for. */
  you: PlayerId;
  /** Alias of `you` per the locked HTTP contract. */
  mySeat: PlayerId;
  /** Join code — ONLY surfaced to a seated player (host/joiner). */
  joinCode?: string;
  self: RedactedSelf;
  opponent: RedactedOpponent;
};

/** Optional match-level metadata the routes layer over the redacted state. */
export type RedactMeta = {
  matchId?: string;
  /** Provide ONLY when the caller is seated — gates joinCode exposure. */
  joinCode?: string;
};

function redactUnit(u: any): RedactedUnit {
  return {
    instanceId: u.instanceId,
    cardId: u.cardId,
    lane: u.lane,
    attack: u.attack,
    health: u.health,
    maxHealth: u.maxHealth,
    speed: u.speed,
    armor: u.armor,
    keywords: Array.isArray(u.keywords) ? [...u.keywords] : [],
    exhausted: !!u.exhausted,
    summoningSick: !!u.summoningSick,
  };
}

function redactBoard(board: any): { front: RedactedUnit[]; back: RedactedUnit[] } {
  return {
    front: (board?.front ?? []).map(redactUnit),
    back: (board?.back ?? []).map(redactUnit),
  };
}

export function redactStateFor(
  playerId: PlayerId,
  state: MatchState,
  meta?: RedactMeta,
): RedactedView {
  const youId: PlayerId = playerId;
  const oppId: PlayerId = playerId === "P1" ? "P2" : "P1";
  const me = state.players[youId];
  const opp = state.players[oppId];

  const self: RedactedSelf = {
    id: youId,
    isYou: true,
    commanderId: me.commanderId,
    nexusHealth: me.nexusHealth ?? 0,
    energy: me.energy ?? 0,
    maxEnergy: me.maxEnergy ?? 0,
    hand: [...(me.hand ?? [])],
    handCount: (me.hand ?? []).length,
    // deckCount from the live field, falling back to the array length — but we
    // never expose the deck ARRAY itself.
    deckCount: me.deckCount ?? (me.deck ?? []).length,
    board: redactBoard(me.board),
    artifacts: [...(me.artifacts ?? [])],
  };

  const opponent: RedactedOpponent = {
    id: oppId,
    isYou: false,
    commanderId: opp.commanderId,
    nexusHealth: opp.nexusHealth ?? 0,
    energy: opp.energy ?? 0,
    maxEnergy: opp.maxEnergy ?? 0,
    handCount: (opp.hand ?? []).length,
    deckCount: opp.deckCount ?? (opp.deck ?? []).length,
    board: redactBoard(opp.board),
    artifacts: [...(opp.artifacts ?? [])],
  };

  const view: RedactedView = {
    turn: state.turn,
    activePlayer: state.activePlayer,
    winner: state.winner,
    you: youId,
    mySeat: youId,
    self,
    opponent,
  };
  // Allow-list only: matchId is non-secret; joinCode is gated by the caller
  // passing it (routes pass it ONLY when the caller is seated).
  if (meta?.matchId) view.matchId = meta.matchId;
  if (meta?.joinCode) view.joinCode = meta.joinCode;
  return view;
}
