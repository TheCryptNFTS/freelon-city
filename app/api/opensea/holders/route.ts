import { NextResponse } from "next/server";
import { CONTRACT, TOTAL } from "@/lib/constants";

export const revalidate = 300;

type OSNft = { identifier?: string; owners?: Array<{ address?: string }>; owner?: string };
type OSResp = { nfts?: OSNft[]; next?: string | null };

export async function GET() {
  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        totalHolders: 0,
        distribution: { "1": 0, "2-5": 0, "6-20": 0, "21+": 0 },
        top10: [],
        error: "no api key",
      });
    }

    const wallets = new Map<string, number[]>();
    let next: string | null = null;
    let pages = 0;
    const MAX_PAGES = 30; // 4040 / 200 ~= 21, allow buffer
    const limit = 200;

    do {
      const url: string = `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT}/nfts?limit=${limit}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!res.ok) break;
      const data: OSResp = await res.json();
      const nfts = data.nfts || [];
      for (const nft of nfts) {
        const tokenId = nft.identifier ? Number(nft.identifier) : NaN;
        if (!Number.isFinite(tokenId)) continue;
        let owner: string | undefined;
        if (Array.isArray(nft.owners) && nft.owners.length > 0) {
          owner = nft.owners[0]?.address;
        } else if (nft.owner) {
          owner = nft.owner;
        }
        if (!owner) continue;
        const key = owner.toLowerCase();
        const arr = wallets.get(key) || [];
        arr.push(tokenId);
        wallets.set(key, arr);
      }
      next = data.next ?? null;
      pages += 1;
      if (pages >= MAX_PAGES) break;
    } while (next);

    // Aggregate distribution buckets
    const dist = { "1": 0, "2-5": 0, "6-20": 0, "21+": 0 } as Record<string, number>;
    for (const ids of wallets.values()) {
      const c = ids.length;
      if (c === 1) dist["1"]++;
      else if (c <= 5) dist["2-5"]++;
      else if (c <= 20) dist["6-20"]++;
      else dist["21+"]++;
    }

    const top10 = [...wallets.entries()]
      .map(([address, ids]) => ({ address, count: ids.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalHolders: wallets.size,
      totalSupply: TOTAL,
      distribution: dist,
      top10,
    });
  } catch {
    return NextResponse.json({
      totalHolders: 0,
      distribution: { "1": 0, "2-5": 0, "6-20": 0, "21+": 0 },
      top10: [],
    });
  }
}
