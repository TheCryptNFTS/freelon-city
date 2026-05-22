import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getHeat } from "@/lib/heat-counters";
import { CIVILIZATIONS } from "@/lib/constants";

export const revalidate = 30;

export async function GET(req: Request) {
  const rl = await limit(req, "market:heat", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const cells = await getHeat();
  const enriched = cells.map((c) => ({
    ...c,
    name: (CIVILIZATIONS as Record<string, { name: string; color: string }>)[c.slug]?.name,
    color: (CIVILIZATIONS as Record<string, { name: string; color: string }>)[c.slug]?.color,
  }));
  return NextResponse.json({ cells: enriched, windowMins: 60 });
}
