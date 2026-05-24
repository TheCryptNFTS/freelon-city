import { NextResponse } from "next/server";
import { CIVILIZATIONS, CONTRACT } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

export const revalidate = 1800;

type Citizen = { id: number; civilization: string };
const CITIZEN_CIV: Record<number, string> = {};
for (const c of citizensData as Citizen[]) CITIZEN_CIV[c.id] = c.civilization;

const MAX_PAGES = 10;

type SaleEvent = {
  event_type?: string;
  nft?: { identifier?: string };
  payment?: { quantity?: string; decimals?: number; symbol?: string };
};

export async function GET() {
  if (!process.env.OPENSEA_API_KEY) {
    return NextResponse.json({ error: "no_api_key", civs: [] }, { status: 200 });
  }

  const perCivVol: Record<string, number> = {};
  const perCivCount: Record<string, number> = {};
  let next: string | undefined;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      // OpenSea v2: collection slug, NOT chain/contract (404).
      void CONTRACT;
      const u = new URL(
        `https://api.opensea.io/api/v2/events/collection/freelons`,
      );
      u.searchParams.set("event_type", "sale");
      u.searchParams.set("limit", "50");
      if (next) u.searchParams.set("next", next);
      const r = await fetch(u.toString(), {
        headers: { "X-API-KEY": process.env.OPENSEA_API_KEY },
        next: { revalidate: 1800 },
      });
      if (!r.ok) break;
      const d = (await r.json()) as { asset_events?: SaleEvent[]; next?: string };
      const events = d.asset_events || [];
      for (const ev of events) {
        const idStr = ev.nft?.identifier;
        if (!idStr) continue;
        const tid = parseInt(idStr, 10);
        const civ = CITIZEN_CIV[tid];
        if (!civ) continue;
        const p = ev.payment;
        if (!p?.quantity) continue;
        if (p.symbol && p.symbol !== "ETH" && p.symbol !== "WETH") continue;
        const { weiToEth } = await import("@/lib/eth-math");
        const eth = weiToEth(p.quantity, Number(p.decimals ?? 18));
        if (!isFinite(eth) || eth <= 0) continue;
        perCivVol[civ] = (perCivVol[civ] || 0) + eth;
        perCivCount[civ] = (perCivCount[civ] || 0) + 1;
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
    volume: perCivVol[slug] ?? 0,
    sales: perCivCount[slug] ?? 0,
  }));

  return NextResponse.json({ civs, source: "opensea_events_v2" });
}
