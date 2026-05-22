import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { CONTRACT } from "@/lib/constants";

type TransferEvent = {
  event_type?: string;
  event_timestamp?: number;
  nft?: { identifier?: string };
};
type SaleEvent = {
  event_type?: string;
  event_timestamp?: number;
  payment?: { quantity?: string; decimals?: number };
};

export type CitizenMeta = {
  daysHeld: number | null;
  lastSaleEth: number | null;
  lastSaleTs: number | null;
};

const cache = new Map<number, { ts: number; data: CitizenMeta }>();
const TTL_MS = 5 * 60 * 1000;

export async function getCitizenMeta(tokenId: number): Promise<CitizenMeta> {
  const cached = cache.get(tokenId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    const empty: CitizenMeta = { daysHeld: null, lastSaleEth: null, lastSaleTs: null };
    cache.set(tokenId, { ts: Date.now(), data: empty });
    return empty;
  }

  // Pull last transfer (= most recent acquisition by current owner) + last sale
  let daysHeld: number | null = null;
  let lastSaleEth: number | null = null;
  let lastSaleTs: number | null = null;

  try {
    const tUrl = `https://api.opensea.io/api/v2/events/chain/ethereum/contract/${CONTRACT}/nfts/${tokenId}?event_type=transfer&limit=1`;
    const r = await fetchWithTimeout(tUrl, {
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      next: { revalidate: 300 },
      timeoutMs: 4000,
    });
    if (r.ok) {
      const d = (await r.json()) as { asset_events?: TransferEvent[] };
      const ev = d.asset_events?.[0];
      if (ev?.event_timestamp) {
        daysHeld = Math.floor((Date.now() - ev.event_timestamp * 1000) / 86400000);
      }
    }
  } catch {
    /* skip */
  }

  try {
    const sUrl = `https://api.opensea.io/api/v2/events/chain/ethereum/contract/${CONTRACT}/nfts/${tokenId}?event_type=sale&limit=1`;
    const r = await fetchWithTimeout(sUrl, {
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      next: { revalidate: 300 },
      timeoutMs: 4000,
    });
    if (r.ok) {
      const d = (await r.json()) as { asset_events?: SaleEvent[] };
      const ev = d.asset_events?.[0];
      if (ev?.payment?.quantity) {
        const decimals = ev.payment.decimals ?? 18;
        lastSaleEth = Number(ev.payment.quantity) / 10 ** decimals;
        lastSaleTs = ev.event_timestamp ?? null;
      }
    }
  } catch {
    /* skip */
  }

  const meta: CitizenMeta = { daysHeld, lastSaleEth, lastSaleTs };
  cache.set(tokenId, { ts: Date.now(), data: meta });
  return meta;
}
