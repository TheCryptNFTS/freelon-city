/**
 * Storage abstraction for Carrier state.
 *
 * Local dev:   in-memory map (resets on server restart)
 * Production:  Upstash Redis if UPSTASH_REDIS_REST_URL is set.
 *
 * To switch on Upstash: set in Vercel env
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * No other code changes needed.
 */
import { CarrierState } from "./carrier";

const memory = new Map<string, CarrierState>();

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const KEY_PREFIX = "freelon:carrier:v1:";

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

export async function getCarrier(handle: string): Promise<CarrierState | null> {
  const norm = handle.toLowerCase().replace(/^@/, "");
  if (!norm) return null;
  if (!hasUpstash) {
    return memory.get(norm) ?? null;
  }
  const raw = (await upstash(["GET", KEY_PREFIX + norm])) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as CarrierState; } catch { return null; }
}

export async function putCarrier(state: CarrierState): Promise<void> {
  const key = KEY_PREFIX + state.handle;
  if (!hasUpstash) {
    memory.set(state.handle, state);
    return;
  }
  await upstash(["SET", key, JSON.stringify(state)]);
}

export async function listTopCarriers(limit = 50): Promise<CarrierState[]> {
  if (!hasUpstash) {
    return Array.from(memory.values())
      .sort((a, b) => b.rank - a.rank || b.totalRelays - a.totalRelays)
      .slice(0, limit);
  }
  // For production, an ordered set would be added later. For now, return empty.
  return [];
}
