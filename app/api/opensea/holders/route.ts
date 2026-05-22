import { NextResponse } from "next/server";
import { TOTAL } from "@/lib/constants";

export const revalidate = 300;

type Holder = { address?: string; quantity?: number; percentage?: number };
type HoldersResp = { holders?: Holder[]; next?: string | null };
type CollectionStats = { total?: { num_owners?: number } };

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

  // 1) totalHolders — single exact call from collection stats
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

  // 2) REAL top holders from OpenSea's holders endpoint. Single request,
  //    returns up to 100 by quantity desc. Replaces the broken sample-based
  //    approach that capped top wallets at ~5 citizens.
  let topAll: Array<{ address: string; count: number }> = [];
  try {
    const r = await fetch(
      "https://api.opensea.io/api/v2/collections/freelons/holders?limit=100",
      {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
      },
    );
    if (r.ok) {
      const d = (await r.json()) as HoldersResp;
      topAll = (d.holders || [])
        .filter((h): h is { address: string; quantity: number } =>
          typeof h.address === "string" && typeof h.quantity === "number",
        )
        .map((h) => ({ address: h.address.toLowerCase(), count: h.quantity }));
    }
  } catch {
    /* fall through */
  }

  // 3) Distribution: derive from the top-100 + tail. We know totalHolders
  //    exactly; subtract counted-in-top from total to estimate the "1 citizen"
  //    bucket (most holders own 1).
  const dist = { "1": 0, "2-5": 0, "6-20": 0, "21+": 0 } as Record<string, number>;
  for (const h of topAll) {
    const c = h.count;
    if (c === 1) dist["1"]++;
    else if (c <= 5) dist["2-5"]++;
    else if (c <= 20) dist["6-20"]++;
    else dist["21+"]++;
  }
  // Holders not in top-100 all own 1 (top-100 covers the tail of "1" bucket
  // and everything above it; remaining = totalHolders - top100.length is the
  // bulk of 1-citizen wallets).
  const remainingOnes = Math.max(0, totalHolders - topAll.length);
  dist["1"] += remainingOnes;

  return NextResponse.json({
    totalHolders,
    totalSupply: TOTAL,
    distribution: dist,
    top10: topAll.slice(0, 10),
    source: "opensea_holders_v2",
  });
}
