import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getMatch, setMatch, seatOf, type MatchRecord } from "@/lib/match-store";
import { redactStateFor } from "@/lib/redact-state";
import { applyAction, type Action } from "@/lib/crypt-engine/engine/reducer";
import type { MatchState } from "@/lib/crypt-engine/engine/state";
import { withLock } from "@/lib/upstash-lock";
import { applyLazyForfeit, TURN_MS } from "@/lib/match-pvp";
import { verifyBearer } from "@/lib/game-session";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/match/[id]/action  (Bearer)  body { version, action }
 *   -> 200 { version, view, events }
 *   -> 403  not seated / acting for another seat / not your turn
 *   -> 409  stale version (someone advanced the match) | lock contention
 *   -> 422  { rejected: true, events }  (reducer rejected; version unchanged)
 *
 * THE core security fix (M3): the acting seat is derived from the AUTHENTICATED
 * session, not trusted from the client. We enforce, in order:
 *   1. caller must hold a seat in this match (seatOf) — else 403.
 *   2. body.action.player MUST equal the caller's seat — else 403. This kills
 *      the old `viewerOf` trust where a client could submit moves as either
 *      player.
 *   3. it must be the caller's turn (state.activePlayer === seat) — else 403.
 * Then load -> applyAction -> setMatch is wrapped in `withLock` for a true CAS,
 * and the optimistic version check still guards stale writes (409).
 *
 * Lazy forfeit runs first: if the opponent blew the turn clock, the caller wins
 * immediately and we skip the move.
 *
 * Cross-origin (game SPA): CORS allow-list, never `*`. Carries NO ledger authority.
 */

type Body = { version?: number; action?: Action };

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "match-action", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await ctx.params;

  const session = await verifyBearer(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: cors });
  }

  if (typeof body.version !== "number" || !body.action || typeof body.action !== "object") {
    return NextResponse.json({ error: "missing_version_or_action" }, { status: 400, headers: cors });
  }
  const action = body.action;
  const clientVersion = body.version;

  // Peek for early authority checks (re-validated inside the lock).
  const pre = await getMatch(id);
  if (!pre) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404, headers: cors });
  }

  const seat = seatOf(pre, session.address);
  if (!seat) {
    return NextResponse.json({ error: "not_seated" }, { status: 403, headers: cors });
  }

  // CORE FIX: the action's declared player must be the caller's OWN seat.
  if (action.player !== seat) {
    return NextResponse.json({ error: "seat_mismatch" }, { status: 403, headers: cors });
  }

  // Lazy forfeit: opponent blew the turn clock -> caller wins, skip the move.
  {
    const lazy = applyLazyForfeit(pre, seat);
    if (lazy.forfeited) {
      const updated: MatchRecord = { ...pre, state: lazy.state };
      const setRes = await setMatch(id, updated, pre.version);
      const rec = setRes.ok ? setRes.record : pre;
      return NextResponse.json(
        {
          version: rec.version,
          view: redactStateFor(seat, rec.state, { matchId: rec.matchId, joinCode: rec.joinCode }),
          events: [{ type: "WIN", player: seat }],
        },
        { headers: cors },
      );
    }
  }

  // Not your turn — 403 (authority), distinct from the reducer's soft reject.
  if (pre.state.activePlayer !== seat) {
    return NextResponse.json(
      {
        error: "not_your_turn",
        version: pre.version,
        view: redactStateFor(seat, pre.state, { matchId: pre.matchId, joinCode: pre.joinCode }),
      },
      { status: 403, headers: cors },
    );
  }

  const result = await withLock("match:" + id, 5, async () => {
    const record = await getMatch(id);
    if (!record) return { http: 404 as const, body: { error: "match_not_found" } };

    // Re-validate seat + turn inside the lock (state may have advanced).
    const lockSeat = seatOf(record, session.address);
    if (lockSeat !== seat) return { http: 403 as const, body: { error: "not_seated" } };

    // Stale version BEFORE running the reducer.
    if (record.version !== clientVersion) {
      return {
        http: 409 as const,
        body: {
          error: "version_conflict",
          version: record.version,
          view: redactStateFor(seat, record.state, { matchId: record.matchId, joinCode: record.joinCode }),
        },
      };
    }

    if (record.state.activePlayer !== seat) {
      return {
        http: 403 as const,
        body: {
          error: "not_your_turn",
          version: record.version,
          view: redactStateFor(seat, record.state, { matchId: record.matchId, joinCode: record.joinCode }),
        },
      };
    }

    const { state: nextState, events } = applyAction(record.state as MatchState, action);

    const rejected = events.find((e) => e.type === "REJECTED");
    if (rejected) {
      // Illegal move: state unchanged, version NOT advanced. 422.
      return {
        http: 422 as const,
        body: {
          rejected: true,
          error: "rejected",
          reason: (rejected as { reason: string }).reason,
          version: record.version,
          events,
          view: redactStateFor(seat, record.state, { matchId: record.matchId, joinCode: record.joinCode }),
        },
      };
    }

    const updated: MatchRecord = {
      ...record,
      state: nextState,
      turnDeadline: Date.now() + TURN_MS,
    };
    const setRes = await setMatch(id, updated, clientVersion);
    if (!setRes.ok) {
      const cur = setRes.current;
      return {
        http: 409 as const,
        body: {
          error: "version_conflict",
          version: cur?.version ?? record.version,
          view: redactStateFor(seat, (cur?.state ?? record.state) as MatchState, {
            matchId: record.matchId,
            joinCode: record.joinCode,
          }),
        },
      };
    }

    return {
      http: 200 as const,
      body: {
        version: setRes.record.version,
        view: redactStateFor(seat, setRes.record.state, {
          matchId: setRes.record.matchId,
          joinCode: setRes.record.joinCode,
        }),
        events,
      },
    };
  });

  // Lock contention: a concurrent action holds the match lock -> 409 retry.
  if (result === null) {
    return NextResponse.json({ error: "version_conflict" }, { status: 409, headers: cors });
  }

  return NextResponse.json(result.body, { status: result.http, headers: cors });
}
