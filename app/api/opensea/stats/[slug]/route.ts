import { NextResponse } from "next/server";
import { collectionBySlug } from "@/lib/collections";

export const revalidate = 300; // 5 min cache

/**
 * GET /api/opensea/stats/[slug]
 *
 * Per-collection OpenSea stats (floor / holders / volume) for any of the
 * 6 connected collections. Parameterized sibling of /api/opensea/stats
 * (which is hardcoded to `freelons`). Used by the /signal portfolio +
 * the landing "Own a citizen" box to show per-collection floors.
 *
 * Slug is validated against CONNECTED_COLLECTIONS so this can't be used as
 * an open OpenSea proxy. Always 200s with nulls on upstream failure so the
 * client never has to handle a hard error for a non-critical stat.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Only allow the known connected collections.
  if (!collectionBySlug(slug)) {
    return NextResponse.json({ floor: null, holders: null, volume: null, error: "unknown_slug" }, { status: 404 });
  }

  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ floor: null, holders: null, volume: null, error: "no_key" }, { status: 200 });
    }
    const res = await fetch(`https://api.opensea.io/api/v2/collections/${slug}/stats`, {
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json({ floor: null, holders: null, volume: null, error: `os_${res.status}` }, { status: 200 });
    }
    const data = await res.json();
    const floor = data?.total?.floor_price ?? data?.intervals?.[0]?.floor_price ?? null;
    const volume = data?.total?.volume ?? null;
    const holders = data?.total?.num_owners ?? null;
    return NextResponse.json({ slug, floor, holders, volume });
  } catch (e) {
    console.error("[opensea/stats/slug]", e);
    return NextResponse.json({ floor: null, holders: null, volume: null, error: "upstream_unavailable" }, { status: 200 });
  }
}
