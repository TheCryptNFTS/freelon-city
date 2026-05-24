/**
 * <FloorPill /> — live floor + 24h delta + holder count, above the hero.
 *
 * Solves the convergent feedback from 4 pros that hex/floor wasn't
 * anchored above the fold — CRO flagged the loading "FLOOR — SYNCING ETH"
 * as the single highest-leverage copy fix on the site.
 *
 * Server component. Fetches OpenSea collection stats (already cached 5min
 * elsewhere on the site) plus the ETH/USD anchor so we can show the
 * floor in dollars at a glance. Never throws — fallback states render
 * cleanly when OpenSea is slow or no API key is configured.
 */
import Link from "next/link";
import { getUsdPerEth } from "@/lib/eth-price";

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
    <Link
      href="https://opensea.io/collection/freelons"
      target="_blank"
      rel="noreferrer"
      className="floor-pill"
      aria-label="View floor on OpenSea"
    >
      <span className="fp-glyph" aria-hidden>⬡</span>
      <span className="fp-line">
        {floor > 0 ? (
          <>
            <span className="fp-num">FLOOR · {floor.toFixed(4)} Ξ</span>
            {floorUsd > 0 && <span className="fp-usd"> · ${floorUsd < 100 ? floorUsd.toFixed(2) : Math.round(floorUsd)}</span>}
            {holders > 0 && <span className="fp-sep"> · </span>}
            {holders > 0 && <span className="fp-num">{holders.toLocaleString()} HOLDERS</span>}
            <span className="fp-sep"> · </span>
            <span className="fp-num">{sales24} SOLD 24H</span>
          </>
        ) : (
          <span className="fp-num">FLOOR · LIVE ON OPENSEA</span>
        )}
      </span>
      <span className="fp-arrow" aria-hidden>↗</span>
      <style>{`
        .floor-pill {
          display: inline-flex; align-items: center; gap: 8px;
          margin: 4px 0 10px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--gold);
          background: rgba(200,167,93,0.10);
          color: var(--gold);
          font-family: var(--mono2);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 700;
          text-decoration: none;
          transition: background 120ms ease, transform 120ms ease;
          flex-wrap: wrap;
          max-width: 100%;
        }
        .floor-pill:hover { background: rgba(200,167,93,0.20); transform: translateY(-1px); }
        .floor-pill .fp-num { font-variant-numeric: tabular-nums; }
        .floor-pill .fp-usd { color: #fff7e0; opacity: 0.85; }
        .floor-pill .fp-sep { opacity: 0.4; }
        .floor-pill .fp-arrow { opacity: 0.9; }
        @media (max-width: 540px) {
          .floor-pill { font-size: 10px; letter-spacing: 0.16em; gap: 6px; padding: 6px 12px; }
        }
      `}</style>
    </Link>
  );
}
