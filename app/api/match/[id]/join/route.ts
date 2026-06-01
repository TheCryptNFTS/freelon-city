import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getMatch, getMatchIdByJoinCode, setMatch, seatOf, type MatchRecord } from "@/lib/match-store";
import { redactStateFor } from "@/lib/redact-state";
import { withLock } from "@/lib/upstash-lock";
import { TURN_MS } from "@/lib/match-pvp";
import { verifyBearer } from "@/lib/game-session";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/match/[id]/join  (Bearer)  body { joinCode }
 *   -> 200 { matchId, version, view, mySeat }
 *   -> 403 (bad join code)
 *   -> 409 (P2 seat already taken by someone else)
 *
 * Seats the authenticated wallet as P2 of an existing match when the joinCode
 * matches and the seat is open. If the caller is ALREADY seated (host re-hits,
 * or P2 re-joins), returns their current view idempotently. Wrapped in
 * `withLock` so two friends racing the same code can't both grab P2.
 *
 * Cross-origin (game SPA): CORS allow-list, never `*`.
 */

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "match-join", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await ctx.params;

  const session = await verifyBearer(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }
  const addr = session.address;

  let body: { joinCode?: string };
  try {
    body = (await req.json()) as { joinCode?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: cors });
  }
  const joinCode = (body.joinCode || "").trim().toUpperCase();

  // The path param may be either the internal matchId OR the short join code a
  // host shared. Resolve to the real matchId so the lock + reads target the
  // canonical record. (A direct getMatch hit means `id` was already the matchId.)
  const matchId =
    (await getMatch(id)) ? id : (await getMatchIdByJoinCode(id)) ?? id;

  const result = await withLock("match:" + matchId, 5, async () => {
    const record = await getMatch(matchId);
    if (!record) return { http: 404 as const, body: { error: "match_not_found" } };

    const existingSeat = seatOf(record, addr);
    if (existingSeat) {
      // Already seated (host or returning joiner) — idempotent success.
      return { http: 200 as const, seat: existingSeat, record };
    }

    if (record.joinCode.toUpperCase() !== joinCode) {
      return { http: 403 as const, body: { error: "bad_join_code" } };
    }

    if (record.players.P2) {
      // Seat filled by a DIFFERENT wallet (we already checked caller above).
      return { http: 409 as const, body: { error: "match_full" } };
    }

    const updated: MatchRecord = {
      ...record,
      players: { P1: record.players.P1, P2: addr.toLowerCase() },
      turnDeadline: Date.now() + TURN_MS,
    };
    const setRes = await setMatch(matchId, updated, record.version);
    if (!setRes.ok) {
      return { http: 409 as const, body: { error: "version_conflict" } };
    }
    return { http: 200 as const, seat: "P2" as const, record: setRes.record };
  });

  if (result === null) {
    // Lock contention — tell client to retry.
    return NextResponse.json({ error: "locked" }, { status: 409, headers: cors });
  }

  if (result.http !== 200) {
    return NextResponse.json(result.body, { status: result.http, headers: cors });
  }

  const { record, seat } = result;
  return NextResponse.json(
    {
      matchId: record.matchId,
      version: record.version,
      mySeat: seat,
      view: redactStateFor(seat, record.state, {
        matchId: record.matchId,
        joinCode: record.joinCode,
      }),
    },
    { headers: cors },
  );
}
