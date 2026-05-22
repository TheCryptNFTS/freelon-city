/**
 * Tiny advisory lock built on Upstash SET NX EX. Used to prevent concurrent
 * tick handlers from double-crediting a wallet (e.g. user opens /wallet in
 * two tabs simultaneously).
 *
 * Behavior:
 *   withLock(key, ttlSec, fn) → runs fn() only if it can acquire the lock,
 *   else resolves with `null` (caller treats as no-op).
 *
 * Failure modes:
 *   - Upstash unavailable: locks degrade to in-process Map. Single instance
 *     mutual exclusion only, which is fine in dev and prevents the two-tab
 *     race in prod when Upstash is up.
 *   - Crash mid-critical-section: lock expires after ttlSec, eventually
 *     unblocking subsequent calls.
 */

const memory = new Map<string, number>(); // key -> expiresAt(ms)
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY = (k: string) => `freelon:lock:v1:${k}`;

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

async function acquire(key: string, ttlSec: number): Promise<boolean> {
  if (!hasUpstash) {
    const now = Date.now();
    const cur = memory.get(key) || 0;
    if (cur > now) return false;
    memory.set(key, now + ttlSec * 1000);
    return true;
  }
  try {
    // SET key value NX EX ttl — returns "OK" on success, nil on fail
    const r = await upstash(["SET", KEY(key), "1", "NX", "EX", String(ttlSec)]);
    return r === "OK";
  } catch {
    return false; // fail closed — better to skip a tick than double-credit
  }
}

async function release(key: string): Promise<void> {
  if (!hasUpstash) {
    memory.delete(key);
    return;
  }
  try {
    await upstash(["DEL", KEY(key)]);
  } catch {
    /* lock will expire on its own */
  }
}

export async function withLock<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const ok = await acquire(key, ttlSec);
  if (!ok) return null;
  try {
    return await fn();
  } finally {
    await release(key);
  }
}
