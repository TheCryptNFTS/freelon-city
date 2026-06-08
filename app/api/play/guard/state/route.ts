/**
 * GET /api/play/guard/state
 *
 * Public, read-only view of the Guard the Pot round: the prize, the escalating
 * fee, total ⬡ burned, the live attempt board (addresses masked), and the winner
 * if the vault has been cracked. Never exposes the secret release token.
 */
import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getRound, getBoard } from "@/lib/guard-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskAddr(a: string): string {
  return a.length >= 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export async function GET(req: Request) {
  const rl = await limit(req, "guard:state", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const live = process.env.GUARD_POT_LIVE === "true";
  const round = await getRound();
  const board = await getBoard(round.round, 30);

  return NextResponse.json({
    live,
    round: round.round,
    status: round.status,
    prizeLabel: round.prizeLabel,
    fee: round.fee,
    attempts: round.attempts,
    totalBurned: round.totalBurned,
    openedAt: round.openedAt,
    winner: round.winner ? maskAddr(round.winner) : null,
    winnerAt: round.winnerAt,
    winningAttempt: round.winningAttempt,
    board: board.map((b) => ({
      addr: maskAddr(b.addr),
      snippet: b.snippet,
      fee: b.fee,
      at: b.at,
      won: b.won,
    })),
  });
}
