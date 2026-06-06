import { limit, tooManyResponse } from "@/lib/rate-limit";
import { publicJson, publicOptions, publicCors, parseTokenId } from "@/lib/public-api";
import { getProgress } from "@/lib/progression-store";
import { getAgentHistory } from "@/lib/agent-history";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/citizens/:id/history?limit=40
 * The agent's body of work: the progression memory log (jobs/missions/levelups)
 * plus the real outputs it has produced. Read-only public data.
 */
export async function OPTIONS() {
  return publicOptions();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "v1-history", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await ctx.params;
  const tokenId = parseTokenId(id);
  if (tokenId === null) {
    return NextResponse.json({ error: "tokenId must be 1..4040" }, { status: 400, headers: publicCors() });
  }

  const url = new URL(req.url);
  const max = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "40", 10)));

  const [progress, work] = await Promise.all([getProgress(tokenId), getAgentHistory(tokenId)]);

  return publicJson({
    tokenId,
    memoryLog: progress.memoryLog.slice(0, max),
    outputs: work.slice(0, max).map((w) => ({
      id: w.id,
      ability: w.abilityLabel,
      task: w.task,
      kind: w.kind,
      body: w.body,
      level: w.level,
      timestamp: w.timestamp,
    })),
  });
}
