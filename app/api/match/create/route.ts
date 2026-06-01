import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { createMatch as persistMatch } from "@/lib/match-store";
import { redactStateFor } from "@/lib/redact-state";
import { buildMatchRecord } from "@/lib/match-pvp";
import { verifyBearer } from "@/lib/game-session";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/match/create  (Bearer)
 *   -> 200 { matchId, version, view, mySeat }
 *
 * Server-authoritative match creation. Requires a valid bearer session — the
 * authenticated wallet is SEATED as P1 (host) and P2 is left empty until a
 * friend joins (via joinCode) or matchmaking pairs in. The `seed` is generated
 * SERVER-SIDE (never client-supplied — it drives every shuffle/draw).
 *
 * Cross-origin (game SPA): CORS allow-list, never `*`.
 *
 * Carries NO hex/ledger authority.
 */

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "match-create", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const session = await verifyBearer(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let record;
  try {
    record = buildMatchRecord(session.address, null);
  } catch (e) {
    return NextResponse.json(
      { error: "bootstrap_failed", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500, headers: cors },
    );
  }

  const stored = await persistMatch(record);

  return NextResponse.json(
    {
      matchId: stored.matchId,
      version: stored.version,
      mySeat: "P1",
      view: redactStateFor("P1", stored.state, {
        matchId: stored.matchId,
        joinCode: stored.joinCode,
      }),
    },
    { headers: cors },
  );
}
