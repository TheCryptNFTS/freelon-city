import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { listTopContributors } from "@/lib/city-store";

export const runtime = "nodejs";
export const revalidate = 60;

/**
 * GET /api/city/leaderboard?limit=25
 * Top wallets by lifetime signal contributed to the city this season.
 */
export async function GET(req: Request) {
  const rl = await limit(req, "city:leaderboard", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const lim = Math.min(50, Math.max(5, parseInt(url.searchParams.get("limit") || "25", 10)));
  const top = await listTopContributors(lim);

  return NextResponse.json({ top });
}
