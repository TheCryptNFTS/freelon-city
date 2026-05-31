/**
 * Live floor prices for the connected collections, off the OpenSea v2
 * stats endpoint.
 *
 * 2026-05-31: the universe shows its art but never its market. Founder
 * wants a floor price on every collection. Prices move, so they are
 * fetched server-side and cached (revalidate 1h) instead of hardcoded —
 * fresh enough to be useful, cheap enough to not hammer OpenSea.
 *
 * Reads OPENSEA_API_KEY (server-side env) — only import this into Server
 * Components, never a client island, or the key would leak. Every call is
 * defensive: a missing key, a rate-limit, or a renamed slug returns null
 * so the UI just hides the price instead of crashing.
 */

export type Floor = { price: number; symbol: string } | null;

/** OpenSea stats slugs per collection. Resolved 2026-05-31. */
export const FLOOR_SLUGS = {
  freelons: "freelons",
  "the-crypt-official": "the-crypt-official",
  crypttradingcards: "crypttradingcards",
  oogies: "oogies",
  emile0x1908: "emile0x1908",
  "smiles-genesis": "smiles-genesis",
} as const;

async function fetchFloor(slug: string): Promise<Floor> {
  const key = process.env.OPENSEA_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.opensea.io/api/v2/collections/${slug}/stats`,
      {
        headers: { "x-api-key": key, accept: "application/json" },
        next: { revalidate: 3600 },
      },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      total?: { floor_price?: number; floor_price_symbol?: string };
    };
    const t = j.total;
    if (!t || typeof t.floor_price !== "number") return null;
    return { price: t.floor_price, symbol: t.floor_price_symbol || "ETH" };
  } catch {
    return null;
  }
}

/** Fetch floors for several slugs in parallel → { slug: Floor }. */
export async function getFloors(
  slugs: readonly string[],
): Promise<Record<string, Floor>> {
  const pairs = await Promise.all(
    slugs.map(async (s) => [s, await fetchFloor(s)] as const),
  );
  return Object.fromEntries(pairs);
}

/**
 * Human floor label, e.g. 0.0029859 → "0.003 ETH", 17.92 → "17.92 APE".
 * Trims to ≤4 significant decimals so dust floors don't read as a wall
 * of zeros. Returns null when there's no price to show.
 */
export function formatFloor(floor: Floor): string | null {
  if (!floor) return null;
  const { price, symbol } = floor;
  let num: string;
  if (price >= 1) num = price.toFixed(2).replace(/\.?0+$/, "");
  else if (price >= 0.01) num = price.toFixed(3).replace(/\.?0+$/, "");
  else num = price.toPrecision(2).replace(/\.?0+$/, "");
  return `${num} ${symbol}`;
}
