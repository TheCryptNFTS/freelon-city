import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getMatch, setMatch, seatOf, type MatchRecord } from "@/lib/match-store";
import { redactStateFor } from "@/lib/redact-state";
import { applyLazyForfeit } from "@/lib/match-pvp";
import { verifyBearer } from "@/lib/game-session";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/match/[id]/resume  (Bearer)
 *   -> 200 { matchId, seat, version, view }   full live state for the caller's seat
 *   -> 401 unauthorized | 403 not seated | 404 not found
 *
 * Reconnect-after-refresh. PvpLobby.handleReconnect lost its in-memory match (page
 * reload) and re-fetches to re-enter. The client posted here but the route didn't
 * exist → every reconnect 404'd and the player was told the match "ended." Mirrors
 * the [id] poll route but returns matchId + seat at the TOP level (the shape the
 * client adopts) and never short-circuits on `since`.
 *
 * Cross-origin (game SPA): CORS allow-list, never `*`. No ledger authority.
 */

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "match-resume", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl, cors);

  const { id } = await ctx.params;

  const session = await verifyBearer(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let record = await getMatch(id);
  if (!record) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404, headers: cors });
  }
  const seat = seatOf(record, session.address);
  if (!seat) {
    return NextResponse.json({ error: "not_seated" }, { status: 403, headers: cors });
  }

  // Honor a blown turn clock on reconnect, same as the poll route.
  const lazy = applyLazyForfeit(record, seat);
  if (lazy.forfeited) {
    const updated: MatchRecord = { ...record, state: lazy.state };
    const setRes = await setMatch(id, updated, record.version);
    if (setRes.ok) record = setRes.record;
  }

  return NextResponse.json(
    {
      matchId: record.matchId,
      seat,
      version: record.version,
      view: redactStateFor(seat, record.state, {
        matchId: record.matchId,
        joinCode: record.joinCode,
      }),
    },
    { headers: cors },
  );
}
