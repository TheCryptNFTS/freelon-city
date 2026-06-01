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
 * GET /api/match/[id]?since=<n>  (Bearer)
 *   -> 200 { version, view }   when record.version > since
 *   -> 200 { stale: true }     when nothing newer than `since`
 *
 * The polling endpoint the client long-polls between its own actions to see the
 * opponent's moves. The caller must be a seated player; the view is redacted
 * for THAT seat (so it can never read the opponent's hand / the deck / seed).
 *
 * Lazy forfeit: if the current turn's deadline has passed and it's the absent
 * player's turn, award the present caller the win and persist before replying.
 *
 * Cross-origin (game SPA): CORS allow-list, never `*`.
 */

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "match-get", { max: 240, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

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

  // Lazy forfeit before answering: an absent opponent who blew the turn clock
  // hands the win to the present caller.
  const lazy = applyLazyForfeit(record, seat);
  if (lazy.forfeited) {
    const updated: MatchRecord = { ...record, state: lazy.state };
    const setRes = await setMatch(id, updated, record.version);
    if (setRes.ok) record = setRes.record;
  }

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw === null ? -1 : Number(sinceRaw);

  if (Number.isFinite(since) && record.version <= since) {
    return NextResponse.json({ stale: true }, { headers: cors });
  }

  return NextResponse.json(
    {
      version: record.version,
      view: redactStateFor(seat, record.state, {
        matchId: record.matchId,
        joinCode: record.joinCode,
      }),
    },
    { headers: cors },
  );
}
