import { NextResponse } from "next/server";

export const revalidate = 120; // 2 min cache

const COLLECTION_SLUG = "freelons";

export async function GET() {
  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) return NextResponse.json({ events: [] });
    const res = await fetch(
      `https://api.opensea.io/api/v2/events/collection/${COLLECTION_SLUG}?event_type=sale&limit=8`,
      { headers: { "X-API-KEY": apiKey, "accept": "application/json" }, next: { revalidate: 120 } },
    );
    if (!res.ok) return NextResponse.json({ events: [] });
    const data = await res.json();
    const events = (data?.asset_events || []).map((e: { nft?: { identifier?: string; name?: string }; payment?: { quantity?: string; decimals?: number }; event_timestamp?: number }) => ({
      tokenId: e.nft?.identifier ? Number(e.nft.identifier) : null,
      name: e.nft?.name,
      priceWei: e.payment?.quantity ?? null,
      priceEth: e.payment?.quantity ? (Number(e.payment.quantity) / 10 ** (e.payment?.decimals ?? 18)).toFixed(4) : null,
      ts: e.event_timestamp ?? null,
    })).filter((x: { tokenId: number | null }) => x.tokenId !== null);
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
