import { NextResponse } from "next/server";
import { CIVILIZATIONS, TOTAL } from "@/lib/constants";

export const revalidate = 300;

const COLLECTION_SLUG = "freelons";
const KEY_HISTORY = "freelon:hex-index:v1:history";
const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

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

type Snap = { ts: number; index: number };

async function readHistory(): Promise<Snap[]> {
  if (!hasUpstash) return [];
  try {
    const raw = (await upstash(["GET", KEY_HISTORY])) as string | null;
    if (!raw) return [];
    const arr = JSON.parse(raw) as Snap[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeHistory(history: Snap[]): Promise<void> {
  if (!hasUpstash) return;
  try {
    await upstash(["SET", KEY_HISTORY, JSON.stringify(history)]);
  } catch {}
}

export async function GET() {
  try {
    let floor = 0;
    const apiKey = process.env.OPENSEA_API_KEY;
    const headers: Record<string, string> = { accept: "application/json" };
    if (apiKey) headers["X-API-KEY"] = apiKey;
    try {
      const r = await fetch(`https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}/stats`, {
        headers,
        next: { revalidate: 300 },
      });
      if (r.ok) {
        const d = await r.json();
        floor = Number(d?.total?.floor_price || 0);
      }
    } catch {}

    // Floor-per-civ is paid tier; use the collection floor across all civs.
    // index = sum(floor[c] * pop[c]) / TOTAL * 10000
    let weighted = 0;
    for (const c of Object.values(CIVILIZATIONS)) {
      weighted += floor * c.population;
    }
    const index = TOTAL > 0 ? (weighted / TOTAL) * 10000 : 0;

    // History + change %.
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    let history = await readHistory();

    // Append a new snapshot if the last one is older than ~1 day (or empty).
    const last = history[history.length - 1];
    if (!last || now - last.ts >= ONE_DAY - 60 * 60 * 1000) {
      history = [...history, { ts: now, index }].slice(-14); // keep last 14 days max
      await writeHistory(history);
    }

    const findClosest = (ageMs: number): Snap | null => {
      if (history.length === 0) return null;
      const target = now - ageMs;
      let best: Snap | null = null;
      let bestDelta = Infinity;
      for (const s of history) {
        const d = Math.abs(s.ts - target);
        if (d < bestDelta) {
          bestDelta = d;
          best = s;
        }
      }
      // Only use if within a 12h window of the target
      if (best && Math.abs(best.ts - target) <= 12 * 60 * 60 * 1000) return best;
      return null;
    };

    const pct = (then: number, now_: number) => (then > 0 ? ((now_ - then) / then) * 100 : null);
    const s24 = findClosest(ONE_DAY);
    const s7 = findClosest(7 * ONE_DAY);
    const change24h = s24 ? pct(s24.index, index) : null;
    const change7d = s7 ? pct(s7.index, index) : null;

    return NextResponse.json({
      index,
      floor,
      change24h,
      change7d,
      history,
    });
  } catch {
    return NextResponse.json({
      index: 0,
      floor: 0,
      change24h: null,
      change7d: null,
      history: [],
    });
  }
}
