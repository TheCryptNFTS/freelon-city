import { NextResponse } from "next/server";
import { weiToEth } from "@/lib/eth-math";

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

    // Bundle detection: group by transaction hash. Per OpenSea v2 today
    // (Discord 2026-05-25, Nonz: "Too much 0 in there mate, good price is
    // 0.003 not 0.0003"), payment.quantity is the PER-TOKEN price for
    // each event row in a bundle, NOT the bundle total. Prior code divided
    // by group size again, producing 10× too-small prices on sweeps.
    // Fix: trust payment.quantity as per-token; only use bundleSize for UI.
    const groupSizes = new Map<string, number>();
    for (const e of raws) {
      const key = e.transaction || `${e.event_timestamp}-${e.seller}`;
      groupSizes.set(key, (groupSizes.get(key) || 0) + 1);
    }

    const events = raws
      .map((e) => {
        const key = e.transaction || `${e.event_timestamp}-${e.seller}`;
        const bundleSize = groupSizes.get(key) || 1;
        const perTokenWei = e.payment?.quantity ? BigInt(e.payment.quantity) : 0n;
        const decimals = e.payment?.decimals ?? 18;
        const perTokenEth = perTokenWei > 0n
          ? weiToEth(perTokenWei, decimals).toFixed(4)
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

    // Bump civ-heat counters for any sale newer than the last seen ts.
    // The counter has a 60-min TTL so it reflects RECENT activity only.
    try {
      const { bumpHeat } = await import("@/lib/heat-counters");
      const citizens = (await import("@/data/citizens.json")).default as Array<{ id: number; civilization: string }>;
      const idToCiv = new Map(citizens.map((c) => [c.id, c.civilization]));
      const cutoff = Math.floor(Date.now() / 1000) - 30 * 60; // last 30 min
      for (const e of events) {
        if (!e.tokenId || !e.ts || e.ts < cutoff) continue;
        const civ = idToCiv.get(e.tokenId);
        if (civ) await bumpHeat(civ, "sale");
      }
    } catch { /* heat is cosmetic, never block the response */ }

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
