import { NextResponse } from "next/server";
import { CIVILIZATIONS } from "@/lib/constants";

export const revalidate = 300;

type PerCivFloor = {
  civs: Array<{ slug: string; floor: number | null; population: number }>;
};

async function getPerCivFloors(origin: string): Promise<Record<string, number | null>> {
  try {
    const r = await fetch(`${origin}/api/opensea/per-civ-floor`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return {};
    const d = (await r.json()) as PerCivFloor;
    const map: Record<string, number | null> = {};
    for (const c of d.civs || []) map[c.slug] = c.floor;
    return map;
  } catch {
    return {};
  }
}

async function getGlobalFloor(): Promise<number> {
  try {
    const headers: Record<string, string> = {};
    if (process.env.OPENSEA_API_KEY) headers["X-API-KEY"] = process.env.OPENSEA_API_KEY;
    const r = await fetch("https://api.opensea.io/api/v2/collections/freelons/stats", {
      headers,
      next: { revalidate: 300 },
    });
    if (!r.ok) return 0;
    const d = await r.json();
    return Number(d?.total?.floor_price || 0);
  } catch {
    return 0;
  }
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const [perCiv, globalFloor] = await Promise.all([
    getPerCivFloors(origin),
    getGlobalFloor(),
  ]);

  const civs = Object.entries(CIVILIZATIONS).map(([slug, c]) => {
    const civFloor = perCiv[slug];
    const usedFloor = civFloor ?? globalFloor;
    return {
      slug,
      name: c.name,
      color: c.color,
      population: c.population,
      floor: usedFloor,
      floorSource: civFloor != null ? "civ" : "global",
      value: usedFloor * c.population,
    };
  });
  const total = civs.reduce((s, c) => s + c.value, 0);
  return NextResponse.json({ floor: globalFloor, total, civs });
}
