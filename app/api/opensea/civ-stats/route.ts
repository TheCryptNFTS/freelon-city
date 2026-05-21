import { NextResponse } from "next/server";
import { CIVILIZATIONS } from "@/lib/constants";

export const revalidate = 300;

export async function GET() {
  // Reuse the /api/opensea/stats endpoint logic — call the existing /api/opensea/stats
  let floor = 0;
  try {
    const headers: Record<string, string> = {};
    if (process.env.OPENSEA_API_KEY) headers["X-API-KEY"] = process.env.OPENSEA_API_KEY;
    const r = await fetch("https://api.opensea.io/api/v2/collections/freelons/stats", { headers, next: { revalidate: 300 } });
    if (r.ok) {
      const d = await r.json();
      floor = Number(d?.total?.floor_price || 0);
    }
  } catch {}

  // For now, value = floor × population. Per-civ floor differences would require trait-floor API (paid tier).
  const civs = Object.entries(CIVILIZATIONS).map(([slug, c]) => ({
    slug,
    name: c.name,
    color: c.color,
    population: c.population,
    floor,
    value: floor * c.population,
  }));
  const total = civs.reduce((s, c) => s + c.value, 0);
  return NextResponse.json({ floor, total, civs });
}
