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

  // HISTORY-PRIVACY (Build Sequence Prompt 11, 2026-06-09): this is a PUBLIC,
  // CORS-open API, so the raw TEXT `body` (owner memory — see
  // HISTORY_VISIBILITY_POLICY) must not be served here either. To preserve the
  // documented contract SHAPE, the `body` KEY is kept, but for text outputs its
  // value becomes a safe summary instead of the raw output. Image `body` (URLs)
  // is retained (shareable renders). Same flag as the public agent route so both
  // strip/unstrip together: HISTORY_PUBLIC_STRIP=false restores raw bodies.
  const stripPublicBody = process.env.HISTORY_PUBLIC_STRIP !== "false";
  const safeBody = (w: { kind: string; task?: string; body: string }) =>
    stripPublicBody && w.kind === "text"
      ? `${w.task ? `${w.task} · ` : ""}content post`
      : w.body;

  return publicJson({
    tokenId,
    memoryLog: progress.memoryLog.slice(0, max),
    outputs: work.slice(0, max).map((w) => ({
      id: w.id,
      ability: w.abilityLabel,
      task: w.task,
      kind: w.kind,
      body: safeBody(w),
      level: w.level,
      timestamp: w.timestamp,
    })),
  });
}
