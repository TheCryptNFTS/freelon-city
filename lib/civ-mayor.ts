/**
 * Mayor of [civ] = wallet that owns the most citizens of that civilization,
 * sampled via OpenSea's per-NFT detail endpoint. Cached server-side for
 * 30 minutes per civ to keep latency bounded.
 *
 * Sampling rationale: scanning all 4040 citizens is too slow per request.
 * We sample ~80 random tokens belonging to the civ each refresh, tally owners,
 * and pick the most-frequent. Over multiple refreshes coverage broadens.
 */

import { CONTRACT } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

type Citizen = { id: number; civilization: string };
const CITIZENS = citizensData as Citizen[];

const SAMPLE_SIZE = 50;
const memCache = new Map<string, { ts: number; mayor: { address: string; count: number } | null }>();
const TTL_MS = 30 * 60 * 1000;

type OSNftDetail = {
  nft?: { owners?: Array<{ address?: string; quantity?: number }> };
};

function pickSample(civ: string, n: number): number[] {
  const pool = CITIZENS.filter((c) => c.civilization === civ);
  if (pool.length === 0) return [];
  // Daily-rotating offset so the sample shifts each day
  const offset = Math.floor(Date.now() / 86400000) % Math.max(1, pool.length);
  const sample: number[] = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const idx = (offset + Math.floor(i * (pool.length / n))) % pool.length;
    sample.push(pool[idx].id);
  }
  return sample;
}

export async function getMayor(civ: string): Promise<{ address: string; count: number } | null> {
  const cached = memCache.get(civ);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.mayor;

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    memCache.set(civ, { ts: Date.now(), mayor: null });
    return null;
  }

  const ids = pickSample(civ, SAMPLE_SIZE);
  if (ids.length === 0) {
    memCache.set(civ, { ts: Date.now(), mayor: null });
    return null;
  }

  const wallets = new Map<string, number>();
  await Promise.all(
    ids.map((tid) =>
      (async () => {
        try {
          const { fetchWithTimeout } = await import("@/lib/fetch-with-timeout");
          const r = await fetchWithTimeout(
            `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT}/nfts/${tid}`,
            {
              headers: { "X-API-KEY": apiKey, accept: "application/json" },
              next: { revalidate: 1800 },
              timeoutMs: 4000,
            },
          );
          if (!r.ok) return;
          const d = (await r.json()) as OSNftDetail;
          const owner = d.nft?.owners?.[0]?.address?.toLowerCase();
          if (!owner) return;
          wallets.set(owner, (wallets.get(owner) || 0) + 1);
        } catch {}
      })(),
    ),
  );

  if (wallets.size === 0) {
    memCache.set(civ, { ts: Date.now(), mayor: null });
    return null;
  }

  let topAddr = "";
  let topCount = 0;
  for (const [addr, count] of wallets.entries()) {
    if (count > topCount) {
      topCount = count;
      topAddr = addr;
    }
  }

  // Only declare a Mayor if their lead is ≥2 (1 of 50 isn't really a mayor)
  const mayor = topCount >= 2 ? { address: topAddr, count: topCount } : null;
  memCache.set(civ, { ts: Date.now(), mayor });
  return mayor;
}
