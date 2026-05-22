/**
 * Heat counters — backend-verified civ activity totals.
 *
 * The LiveHeatGrid was previously pure client state, which made the cell
 * counters spoofable from the browser console. Now we expose
 * `/api/market/heat` (rate-limited, cached) that reads authoritative
 * counters from Upstash. Counters are incremented by the same code paths
 * that detect new sales / signals, so the client just displays trusted
 * values.
 *
 * Keys (per civilization slug):
 *   freelon:heat:v1:sales:<slug>   — cumulative sale count (60-min TTL)
 *   freelon:heat:v1:signals:<slug> — cumulative signal count (60-min TTL)
 *
 * 60-minute TTL means the heat is genuinely "recent", not a lifetime
 * accumulator that gets dominated by historical activity.
 */

import { CIVILIZATIONS } from "@/lib/constants";

const memory: Record<string, { sales: number; signals: number }> = {};
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY_SALES = (slug: string) => `freelon:heat:v1:sales:${slug}`;
const KEY_SIGNALS = (slug: string) => `freelon:heat:v1:signals:${slug}`;
const TTL_SEC = 60 * 60;

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

export async function bumpHeat(slug: string, kind: "sale" | "signal"): Promise<void> {
  if (!hasUpstash) {
    if (!memory[slug]) memory[slug] = { sales: 0, signals: 0 };
    if (kind === "sale") memory[slug].sales++;
    else memory[slug].signals++;
    return;
  }
  try {
    const key = kind === "sale" ? KEY_SALES(slug) : KEY_SIGNALS(slug);
    await upstash(["INCR", key]);
    await upstash(["EXPIRE", key, String(TTL_SEC)]);
  } catch {/* non-fatal */}
}

export type HeatCell = { slug: string; sales: number; signals: number };

export async function getHeat(): Promise<HeatCell[]> {
  const civs = Object.keys(CIVILIZATIONS);
  if (!hasUpstash) {
    return civs.map((slug) => ({
      slug,
      sales: memory[slug]?.sales || 0,
      signals: memory[slug]?.signals || 0,
    }));
  }
  try {
    // MGET both arrays
    const saleKeys = civs.map(KEY_SALES);
    const sigKeys = civs.map(KEY_SIGNALS);
    const [salesRaw, sigsRaw] = await Promise.all([
      upstash(["MGET", ...saleKeys]) as Promise<(string | null)[]>,
      upstash(["MGET", ...sigKeys]) as Promise<(string | null)[]>,
    ]);
    return civs.map((slug, i) => ({
      slug,
      sales: Number(salesRaw[i] || 0),
      signals: Number(sigsRaw[i] || 0),
    }));
  } catch {
    return civs.map((slug) => ({ slug, sales: 0, signals: 0 }));
  }
}
