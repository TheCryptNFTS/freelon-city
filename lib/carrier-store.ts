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
import { upstash, hasUpstash } from "@/lib/upstash-client";

const memory = new Map<string, CarrierState>();

const KEY_PREFIX = "freelon:carrier:v1:";

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

/**
 * Advisory mutex for serializing the read-modify-write cycle in the
 * carrier POST handler (decay + relay credit). Without this, two near-
 * simultaneous relay requests would both read the same state, each add
 * their own +12 rank / +10 hex, and the second write would clobber the
 * first — losing one relay's worth of progress.
 *
 * 3s TTL self-heals after a crash mid-update. The handler proceeds
 * without the lock if it can't acquire one in time (lost progress is a
 * recoverable annoyance, not a security issue).
 */
export async function withCarrierLock<T>(
  handle: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!hasUpstash) return fn();
  const norm = handle.toLowerCase().replace(/^@/, "");
  const lockKey = `freelon:carrier:lock:${norm}`;
  let gotLock = false;
  for (let i = 0; i < 5; i++) {
    try {
      if ((await upstash(["SET", lockKey, "1", "NX", "EX", "3"])) === "OK") {
        gotLock = true;
        break;
      }
    } catch { break; }
    await new Promise((r) => setTimeout(r, 80 + i * 40));
  }
  try {
    return await fn();
  } finally {
    if (gotLock) {
      try { await upstash(["DEL", lockKey]); } catch {}
    }
  }
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
