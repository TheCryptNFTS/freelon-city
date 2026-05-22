import { NextResponse } from "next/server";

export const revalidate = 120; // 2 min cache

const COLLECTION_SLUG = "freelons";

type RawEvent = {
  nft?: { identifier?: string; name?: string };
  payment?: { quantity?: string; decimals?: number };
  event_timestamp?: number;
  transaction?: string;
  seller?: string;
  buyer?: string;
};

export async function GET() {
  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) return NextResponse.json({ events: [] });
    const res = await fetch(
      `https://api.opensea.io/api/v2/events/collection/${COLLECTION_SLUG}?event_type=sale&limit=20`,
      { headers: { "X-API-KEY": apiKey, "accept": "application/json" }, next: { revalidate: 120 } },
    );
    if (!res.ok) return NextResponse.json({ events: [] });
    const data = await res.json();
    const raws = (data?.asset_events || []) as RawEvent[];

    // Bundle detection: group by transaction hash (or timestamp+seller as
    // fallback). OpenSea attributes the FULL bundle price to each token row,
    // which silently inflates displayed per-token price. Divide by group size.
    const groupSizes = new Map<string, number>();
    for (const e of raws) {
      const key = e.transaction || `${e.event_timestamp}-${e.seller}`;
      groupSizes.set(key, (groupSizes.get(key) || 0) + 1);
    }

    const events = raws
      .map((e) => {
        const key = e.transaction || `${e.event_timestamp}-${e.seller}`;
        const bundleSize = groupSizes.get(key) || 1;
        const totalWei = e.payment?.quantity ? BigInt(e.payment.quantity) : 0n;
        const perTokenWei = bundleSize > 1 ? totalWei / BigInt(bundleSize) : totalWei;
        const decimals = e.payment?.decimals ?? 18;
        const perTokenEth = totalWei > 0n
          ? (Number(perTokenWei) / 10 ** decimals).toFixed(4)
          : null;
        return {
          tokenId: e.nft?.identifier ? Number(e.nft.identifier) : null,
          name: e.nft?.name,
          priceWei: perTokenWei.toString(),
          priceEth: perTokenEth,
          ts: e.event_timestamp ?? null,
          bundleSize,
          buyer: e.buyer?.toLowerCase() ?? null,
          tx: e.transaction ?? null,
        };
      })
      .filter((x) => x.tokenId !== null)
      .slice(0, 12);

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
