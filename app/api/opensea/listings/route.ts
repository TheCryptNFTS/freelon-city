import { NextResponse } from "next/server";

export const revalidate = 300;

const MAX_PAGES = 3;

type Listing = {
  protocol_data?: {
    parameters?: {
      offer?: Array<{ token?: string; identifierOrCriteria?: string }>;
    };
  };
  price?: {
    current?: { value?: string; decimals?: number; currency?: string };
  };
};

export type ListingItem = { tokenId: number; priceEth: number };

export async function GET() {
  if (!process.env.OPENSEA_API_KEY) {
    return NextResponse.json({ listings: [] satisfies ListingItem[] });
  }

  const seen = new Map<number, number>(); // tokenId -> lowest price seen
  let next: string | undefined;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const u = new URL(
        "https://api.opensea.io/api/v2/listings/collection/freelons/all",
      );
      u.searchParams.set("limit", "100");
      if (next) u.searchParams.set("next", next);
      const r = await fetch(u.toString(), {
        headers: { "X-API-KEY": process.env.OPENSEA_API_KEY },
        next: { revalidate: 300 },
      });
      if (!r.ok) break;
      const d = (await r.json()) as { listings?: Listing[]; next?: string };
      const listings = d.listings || [];
      for (const l of listings) {
        const offer = l.protocol_data?.parameters?.offer?.[0];
        const tokenIdStr = offer?.identifierOrCriteria;
        if (!tokenIdStr) continue;
        const tid = parseInt(tokenIdStr, 10);
        if (!Number.isFinite(tid)) continue;
        const cur = l.price?.current;
        if (!cur?.value) continue;
        if (cur.currency && cur.currency !== "ETH" && cur.currency !== "WETH") continue;
        const decimals = Number(cur.decimals ?? 18);
        const { weiToEth } = await import("@/lib/eth-math");
        const eth = weiToEth(cur.value, decimals);
        if (!isFinite(eth) || eth <= 0) continue;
        const prev = seen.get(tid);
        if (prev === undefined || eth < prev) seen.set(tid, eth);
      }
      next = d.next;
      if (!next) break;
    }
  } catch {
    /* fall through */
  }

  const listings: ListingItem[] = Array.from(seen.entries())
    .map(([tokenId, priceEth]) => ({ tokenId, priceEth }))
    .sort((a, b) => a.priceEth - b.priceEth);

  return NextResponse.json({ listings });
}
