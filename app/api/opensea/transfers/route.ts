import { NextResponse } from "next/server";

export const revalidate = 300;

const COLLECTION_SLUG = "freelons";
const MAX_PAGES = 4;

type RawEvent = {
  nft?: { identifier?: string; name?: string };
  from_address?: string;
  to_address?: string;
  event_timestamp?: number;
};

export async function GET() {
  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) return NextResponse.json({ events: [] });

    const out: Array<{
      tokenId: number;
      name: string | null;
      from: string;
      to: string;
      ts: number | null;
    }> = [];

    let next: string | null = null;
    let pages = 0;

    do {
      const url: string = next
        ? `https://api.opensea.io/api/v2/events/collection/${COLLECTION_SLUG}?event_type=transfer&limit=50&next=${encodeURIComponent(next)}`
        : `https://api.opensea.io/api/v2/events/collection/${COLLECTION_SLUG}?event_type=transfer&limit=50`;

      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!res.ok) break;
      const data: { asset_events?: RawEvent[]; next?: string | null } = await res.json();
      const arr = data.asset_events || [];

      for (const e of arr) {
        const idStr = e.nft?.identifier;
        if (!idStr) continue;
        const tokenId = Number(idStr);
        if (!Number.isFinite(tokenId)) continue;
        out.push({
          tokenId,
          name: e.nft?.name ?? null,
          from: (e.from_address || "").toLowerCase(),
          to: (e.to_address || "").toLowerCase(),
          ts: e.event_timestamp ?? null,
        });
      }

      next = data.next ?? null;
      pages++;
    } while (next && pages < MAX_PAGES);

    return NextResponse.json({ events: out });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
