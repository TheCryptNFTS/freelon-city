import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getMatch, setMatch, seatOf, type MatchRecord } from "@/lib/match-store";
import { redactStateFor } from "@/lib/redact-state";
import type { MatchState, PlayerId } from "@/lib/crypt-engine/engine/state";
import { withLock } from "@/lib/upstash-lock";
import { verifyBearer } from "@/lib/game-session";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/match/[id]/concede  (Bearer, no body)
 *   -> 200 { version, view }   the conceder LOSES; the opponent is set as winner
 *   -> 401  no session
 *   -> 403  not seated in this match
 *   -> 404  match not found
 *   -> 409  lock contention (retry)
 *
 * The PvP "Concede" button (useRemoteCryptMatch.ts) posted here, but the route
 * did not exist — every quit 404'd and the client fell back to a refetch, so a
 * player could never actually leave a match. Server-authoritative + idempotent:
 * if the match is already decided (a prior concede, the opponent's lazy-forfeit,
 * or a natural finish) we return the current decided view unchanged, so a
 * double-tap or a concede racing the opponent's forfeit is safe.
 *
 * Sets state.winner directly to the opponent — the same terminal shape
 * applyLazyForfeit produces. Cross-origin (game SPA): CORS allow-list, never `*`.
 * Carries NO ledger authority.
 */

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "match-concede", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl, cors);

  const { id } = await ctx.params;

  const session = await verifyBearer(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  // Peek for early authority checks (re-validated inside the lock).
  const pre = await getMatch(id);
  if (!pre) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404, headers: cors });
  }
  const seat = seatOf(pre, session.address);
  if (!seat) {
    return NextResponse.json({ error: "not_seated" }, { status: 403, headers: cors });
  }

  const result = await withLock("match:" + id, 5, async () => {
    const record = await getMatch(id);
    if (!record) return { http: 404 as const, body: { error: "match_not_found" } };

    const lockSeat = seatOf(record, session.address);
    if (!lockSeat) return { http: 403 as const, body: { error: "not_seated" } };

    // Already decided → return the current decided view unchanged (idempotent).
    if (record.state.winner) {
      return {
        http: 200 as const,
        body: {
          version: record.version,
          view: redactStateFor(lockSeat, record.state, { matchId: record.matchId, joinCode: record.joinCode }),
        },
      };
    }

    // Conceding seat LOSES → the opponent is the winner.
    const opponent: PlayerId = lockSeat === "P1" ? "P2" : "P1";
    const nextState: MatchState = { ...(record.state as MatchState), winner: opponent };
    const updated: MatchRecord = { ...record, state: nextState };

    const setRes = await setMatch(id, updated, record.version);
    if (!setRes.ok) {
      // A concurrent write advanced the match (e.g. the opponent's move/forfeit).
      // Whatever landed is authoritative — return it.
      const cur = setRes.current ?? record;
      return {
        http: 200 as const,
        body: {
          version: cur.version,
          view: redactStateFor(lockSeat, cur.state as MatchState, { matchId: cur.matchId, joinCode: cur.joinCode }),
        },
      };
    }

    return {
      http: 200 as const,
      body: {
        version: setRes.record.version,
        view: redactStateFor(lockSeat, setRes.record.state, {
          matchId: setRes.record.matchId,
          joinCode: setRes.record.joinCode,
        }),
      },
    };
  });

  // Lock contention: a concurrent action holds the match lock -> tell the client
  // to refetch (the poll loop will pick up the decided state).
  if (result === null) {
    return NextResponse.json({ error: "version_conflict" }, { status: 409, headers: cors });
  }

  return NextResponse.json(result.body, { status: result.http, headers: cors });
}
