/**
 * Tracks per-handle ownership of shop items + global sold counts.
 *
 * Local dev:  in-memory
 * Production: Upstash Redis if UPSTASH_REDIS_REST_URL is set.
 *
 * Mirrors lib/unlock-store.ts pattern.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const memOwned = new Map<string, Set<string>>();  // handle -> Set<itemId>
const memSold = new Map<string, number>();         // itemId -> count

const KEY_OWNED = (h: string) => `freelon:shop:owned:${h}`;
const KEY_SOLD = (id: string) => `freelon:shop:sold:${id}`;

function normHandle(handle: string): string {
  return handle.toLowerCase().replace(/^@/, "");
}

export async function getOwned(handle: string): Promise<string[]> {
  const h = normHandle(handle);
  if (!h) return [];
  if (!hasUpstash) {
    return Array.from(memOwned.get(h) ?? []);
  }
  const r = (await upstash(["SMEMBERS", KEY_OWNED(h)])) as string[] | null;
  return r ?? [];
}

export async function addOwned(handle: string, itemId: string): Promise<void> {
  const h = normHandle(handle);
  if (!h || !itemId) return;
  if (!hasUpstash) {
    if (!memOwned.has(h)) memOwned.set(h, new Set());
    memOwned.get(h)!.add(itemId);
    return;
  }
  await upstash(["SADD", KEY_OWNED(h), itemId]);
}

export async function getGlobalSold(itemId: string): Promise<number> {
  if (!itemId) return 0;
  if (!hasUpstash) {
    return memSold.get(itemId) ?? 0;
  }
  const r = (await upstash(["GET", KEY_SOLD(itemId)])) as string | null;
  return r ? parseInt(r, 10) || 0 : 0;
}

export async function incrementSold(itemId: string): Promise<void> {
  if (!itemId) return;
  if (!hasUpstash) {
    memSold.set(itemId, (memSold.get(itemId) ?? 0) + 1);
    return;
  }
  await upstash(["INCR", KEY_SOLD(itemId)]);
}
