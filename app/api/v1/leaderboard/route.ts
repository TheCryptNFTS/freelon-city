import { limit, tooManyResponse } from "@/lib/rate-limit";
import { publicJson, publicOptions, publicCors } from "@/lib/public-api";
import { topCitizens, type LeaderboardMetric } from "@/lib/progression-store";
import { getCitizen } from "@/lib/citizens";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METRICS: readonly LeaderboardMetric[] = ["level", "rep", "jobs"];

/**
 * GET /api/v1/leaderboard?metric=level|rep|jobs&limit=50
 * Top agents by a metric (exact top-N via Redis sorted sets). Public read-only.
 */
export async function OPTIONS() {
  return publicOptions();
}

export async function GET(req: Request) {
  const rl = await limit(req, "v1-leaderboard", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const metricParam = (url.searchParams.get("metric") || "level") as LeaderboardMetric;
  if (!METRICS.includes(metricParam)) {
    return NextResponse.json({ error: "metric must be level|rep|jobs" }, { status: 400, headers: publicCors() });
  }
  const limitN = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

  const rows = await topCitizens(metricParam, limitN);

  return publicJson({
    metric: metricParam,
    count: rows.length,
    top: rows.map((r) => ({
      tokenId: r.tokenId,
      value: r.value,
      name: getCitizen(r.tokenId)?.name ?? null,
    })),
  });
}
