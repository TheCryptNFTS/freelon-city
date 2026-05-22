import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min cache

const COLLECTION_SLUG = "freelons";

export async function GET() {
  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ floor: null, holders: null, volume: null, error: "no_key" }, { status: 200 });
    }
    const res = await fetch(`https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}/stats`, {
      headers: { "X-API-KEY": apiKey, "accept": "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json({ floor: null, holders: null, volume: null, error: `os_${res.status}` }, { status: 200 });
    }
    const data = await res.json();
    const floor = data?.total?.floor_price ?? data?.intervals?.[0]?.floor_price ?? null;
    const volume = data?.total?.volume ?? null;
    const holders = data?.total?.num_owners ?? null;
    return NextResponse.json({ floor, holders, volume });
  } catch (e) {
    // Log server-side; return a generic code so stack traces don't leak.
    console.error("[opensea/stats]", e);
    return NextResponse.json({ floor: null, holders: null, volume: null, error: "upstream_unavailable" }, { status: 200 });
  }
}
