import { NextResponse } from "next/server";
import { cronAuthed } from "@/lib/cron-auth";
import { listMatchRecords, setMatch, type MatchRecord } from "@/lib/match-store";
import { HARD_IDLE_MS } from "@/lib/match-pvp";
import type { MatchState } from "@/lib/crypt-engine/engine/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel cron backstop — SCANs `freelon:match:v1:*` and forfeits any match left
 * idle past the HARD window. This catches matches BOTH players abandoned (the
 * lazy-forfeit path in the action/GET handlers only fires when a present player
 * pokes the match). The win goes to the player whose turn it is NOT, because
 * the ACTIVE player is the one who failed to move within the clock.
 *
 * Minimal by design: live games are never killed (generous HARD_IDLE_MS), and
 * already-decided / unstarted (no P2) matches are skipped. TTL on the match key
 * still evicts the record afterwards.
 *
 * Auth: Vercel cron Bearer (CRON_SECRET). Fails closed if unconfigured.
 * Schedule it in vercel.json.
 */

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_unconfigured" }, { status: 503 });
  }
  if (!cronAuthed(auth)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const records = await listMatchRecords(500);
  let swept = 0;

  for (const rec of records) {
    if (rec.state.winner) continue; // already decided
    if (!rec.players?.P2) continue; // never started — no opponent to forfeit
    const idle = now - (rec.turnDeadline ?? rec.updatedAt ?? now);
    if (idle < HARD_IDLE_MS) continue;

    // The active player blew the clock -> the OTHER player wins.
    const winner = rec.state.activePlayer === "P1" ? "P2" : "P1";
    const next = structuredClone(rec.state) as MatchState;
    next.winner = winner;
    const updated: MatchRecord = { ...rec, state: next };
    const setRes = await setMatch(rec.matchId, updated, rec.version);
    if (setRes.ok) swept++;
  }

  return NextResponse.json({ ok: true, scanned: records.length, swept });
}
