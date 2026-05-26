/**
 * <FloorPill /> — live floor + 24h delta + holder count, above the hero.
 *
 * Refactored onto the shared <Pill variant="gold" /> primitive. All
 * border/background/typography lives in tokens; this component now
 * only fetches data + composes the inline label.
 */
import { getUsdPerEth } from "@/lib/eth-price";
import { Pill } from "@/components/ui";

const COLLECTION_SLUG = "freelons";

type OSStats = {
  total?: { floor_price?: number; num_owners?: number; sales?: number };
  intervals?: Array<{ interval: string; volume?: number; sales?: number }>;
};

async function fetchOsStats(): Promise<OSStats | null> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(
      `https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}/stats`,
      { headers: { "X-API-KEY": apiKey, accept: "application/json" }, next: { revalidate: 300 } },
    );
    if (!r.ok) return null;
    return (await r.json()) as OSStats;
  } catch {
    return null;
  }
}

export async function FloorPill() {
  const [stats, usdPerEth] = await Promise.all([fetchOsStats(), getUsdPerEth()]);
  const floor = Number(stats?.total?.floor_price || 0);
  const holders = Number(stats?.total?.num_owners || 0);
  const oneDay = stats?.intervals?.find((i) => i.interval === "one_day");
  const sales24 = Number(oneDay?.sales || 0);
  const floorUsd = floor > 0 ? floor * usdPerEth : 0;

  return (
    <Pill
      variant="gold"
      href="https://opensea.io/collection/freelons"
      external
      ariaLabel="View floor on OpenSea"
      className="floor-pill-wrap"
    >
      <span aria-hidden>⬡</span>
      {floor > 0 ? (
        <>
          <span className="ui-pill__num">FLOOR · {floor.toFixed(4)} Ξ</span>
          {floorUsd > 0 && (
            <span className="floor-pill-usd">${floorUsd < 100 ? floorUsd.toFixed(2) : Math.round(floorUsd)}</span>
          )}
          {holders > 0 && <span className="ui-pill__num">{holders.toLocaleString()} HOLDERS</span>}
          <span className="ui-pill__num">{sales24} SOLD 24H</span>
        </>
      ) : (
        <span className="ui-pill__num">FLOOR · LIVE ON OPENSEA</span>
      )}
      <span aria-hidden className="floor-pill-arrow">↗</span>
      <style>{`
        .floor-pill-wrap { margin: 4px 0 10px; }
        .floor-pill-usd { color: #fff7e0; opacity: 0.85; }
        .floor-pill-arrow { opacity: 0.9; }
      `}</style>
    </Pill>
  );
}
