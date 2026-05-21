import { NextResponse } from "next/server";
import { CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

export const revalidate = 600;

type Citizen = { id: number; civilization: string };
const CITIZEN_CIV: Record<number, string> = {};
for (const c of citizensData as Citizen[]) CITIZEN_CIV[c.id] = c.civilization;

const MAX_PAGES = 8;

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

export async function GET() {
  if (!process.env.OPENSEA_API_KEY) {
    return NextResponse.json({ error: "no_api_key", civs: [] }, { status: 200 });
  }

  const perCivMin: Record<string, number> = {};
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
        next: { revalidate: 600 },
      });
      if (!r.ok) break;
      const d = (await r.json()) as { listings?: Listing[]; next?: string };
      const listings = d.listings || [];
      for (const l of listings) {
        const offer = l.protocol_data?.parameters?.offer?.[0];
        const tokenIdStr = offer?.identifierOrCriteria;
        if (!tokenIdStr) continue;
        const tid = parseInt(tokenIdStr, 10);
        const civ = CITIZEN_CIV[tid];
        if (!civ) continue;
        const cur = l.price?.current;
        if (!cur?.value) continue;
        // Only count ETH/WETH listings
        if (cur.currency && cur.currency !== "ETH" && cur.currency !== "WETH") continue;
        const decimals = Number(cur.decimals ?? 18);
        const eth = Number(BigInt(cur.value)) / 10 ** decimals;
        if (!isFinite(eth) || eth <= 0) continue;
        if (perCivMin[civ] === undefined || eth < perCivMin[civ]) {
          perCivMin[civ] = eth;
        }
      }
      next = d.next;
      if (!next) break;
    }
  } catch {
    /* fall through */
  }

  const civs = Object.entries(CIVILIZATIONS).map(([slug, c]) => ({
    slug,
    name: c.name,
    color: c.color,
    population: c.population,
    floor: perCivMin[slug] ?? null,
  }));

  return NextResponse.json({ civs, source: "opensea_listings_v2" });
}
