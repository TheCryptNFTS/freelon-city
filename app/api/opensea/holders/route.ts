import { NextResponse } from "next/server";
import { CONTRACT, TOTAL } from "@/lib/constants";

export const revalidate = 300;

type OSNftDetail = {
  nft?: { owners?: Array<{ address?: string; quantity?: number }> };
};
type CollectionStats = { total?: { num_owners?: number } };

const MAX_DETAIL_PAGES = 60; // ~ scans 60 token ids per refresh
const PER_REFRESH = 60;

export async function GET() {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      totalHolders: 0,
      totalSupply: TOTAL,
      distribution: { "1": 0, "2-5": 0, "6-20": 0, "21+": 0 },
      top10: [],
      error: "no_api_key",
    });
  }

  // 1) Real totalHolders from the collection stats endpoint (cheap, single call).
  let totalHolders = 0;
  try {
    const r = await fetch(
      "https://api.opensea.io/api/v2/collections/freelons/stats",
      {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
      },
    );
    if (r.ok) {
      const d = (await r.json()) as CollectionStats;
      totalHolders = Number(d?.total?.num_owners || 0);
    }
  } catch {
    /* fall through */
  }

  // 2) Sample owner distribution from a slice of token IDs (rotating).
  //    The detailed NFT endpoint returns owners[], so we use that for the sample.
  //    Bucket the sample by per-wallet count to approximate distribution shape.
  const offset = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % TOTAL;
  const wallets = new Map<string, number>();
  let scanned = 0;

  await Promise.all(
    Array.from({ length: PER_REFRESH }, (_, k) => {
      const tid = ((offset + k * Math.floor(TOTAL / MAX_DETAIL_PAGES)) % TOTAL) + 1;
      return (async () => {
        try {
          const r = await fetch(
            `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT}/nfts/${tid}`,
            {
              headers: { "X-API-KEY": apiKey, accept: "application/json" },
              next: { revalidate: 1800 },
            },
          );
          if (!r.ok) return;
          const d = (await r.json()) as OSNftDetail;
          const owner = d.nft?.owners?.[0]?.address?.toLowerCase();
          if (!owner) return;
          wallets.set(owner, (wallets.get(owner) || 0) + 1);
          scanned++;
        } catch {
          /* skip */
        }
      })();
    }),
  );

  const dist = { "1": 0, "2-5": 0, "6-20": 0, "21+": 0 } as Record<string, number>;
  for (const c of wallets.values()) {
    if (c === 1) dist["1"]++;
    else if (c <= 5) dist["2-5"]++;
    else if (c <= 20) dist["6-20"]++;
    else dist["21+"]++;
  }

  const top10 = [...wallets.entries()]
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    totalHolders,
    totalSupply: TOTAL,
    sampleSize: scanned,
    distribution: dist,
    top10,
    note:
      scanned > 0
        ? "Distribution is a rotating sample; totalHolders is exact from OpenSea stats."
        : "Sample unavailable; showing exact totalHolders only.",
  });
}
