/**
 * ETH / USD price helper.
 *
 * Used for "hex → $" anchors on the homepage mechanic cards and any
 * other surface that wants to translate hex earnings into a dollar
 * value the visitor can actually feel.
 *
 * Source: CoinGecko free tier (no API key). Cached 1h server-side via
 * Next.js fetch revalidate so we don't hammer them. Returns 3400 as a
 * fallback if the fetch fails — better to show a slightly stale anchor
 * than no anchor at all (no-anchor was the CRO finding we're fixing).
 */

const FALLBACK_USD_PER_ETH = 3400;
const CACHE_SECONDS = 60 * 60; // 1 hour

let memoryCache: { usd: number; ts: number } | null = null;
const MEMORY_TTL_MS = 60 * 60 * 1000;

export async function getUsdPerEth(): Promise<number> {
  // Process-level memo first (Vercel functions can be warm across requests)
  if (memoryCache && Date.now() - memoryCache.ts < MEMORY_TTL_MS) {
    return memoryCache.usd;
  }
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: CACHE_SECONDS } },
    );
    if (!r.ok) throw new Error(`http_${r.status}`);
    const j = (await r.json()) as { ethereum?: { usd?: number } };
    const usd = Number(j?.ethereum?.usd);
    if (!Number.isFinite(usd) || usd <= 0) throw new Error("bad_payload");
    memoryCache = { usd, ts: Date.now() };
    return usd;
  } catch {
    return memoryCache?.usd || FALLBACK_USD_PER_ETH;
  }
}

/**
 * Convert hex amount to USD at current ETH price + the canonical
 * HEX_PER_ETH peg (100,000 hex = 1 ETH). Returns a formatted string
 * like "≈ $17.00" — ready to drop into UI.
 */
export function hexToUsdLabel(hex: number, usdPerEth: number, hexPerEth = 100_000): string {
  const eth = hex / hexPerEth;
  const usd = eth * usdPerEth;
  if (usd >= 100) return `≈ $${Math.round(usd).toLocaleString()}`;
  if (usd >= 1) return `≈ $${usd.toFixed(2)}`;
  if (usd >= 0.01) return `≈ $${usd.toFixed(2)}`;
  return `≈ $${usd.toFixed(3)}`;
}
