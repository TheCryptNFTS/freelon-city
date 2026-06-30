/**
 * Tracks which citizen deep-bios have been unlocked, and by whom.
 * Two views:
 *   - per-handle: which citizens has @x unlocked
 *   - per-citizen: who unlocked this citizen (for "Unlocked by @x" attribution)
 *
 * Storage abstraction same pattern as carrier-store: in-memory locally,
 * Upstash Redis in production.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const memHandleSet = new Map<string, Set<number>>();      // handle → Set<citizenId>
const memCitizenUnlockers = new Map<number, Set<string>>(); // citizenId → Set<handle>
const memGiftAttribution = new Map<number, string>();      // citizenId → handle of original gifter

const KEY = (s: string) => `freelon:unlock:v1:${s}`;

export async function hasUnlocked(handle: string, citizenId: number): Promise<boolean> {
  const h = handle.toLowerCase().replace(/^@/, "");
  if (!hasUpstash) {
    return memHandleSet.get(h)?.has(citizenId) ?? false;
  }
  try {
    const r = (await upstash(["SISMEMBER", KEY(`h:${h}`), String(citizenId)])) as number;
    return r === 1;
  } catch {
    // Fail CLOSED: if the store is unreachable / rate-limited, treat as NOT
    // unlocked rather than 500-ing the status GET or accidentally granting access.
    return false;
  }
}

export async function unlock(handle: string, citizenId: number, gifter?: string): Promise<void> {
  const h = handle.toLowerCase().replace(/^@/, "");
  if (!hasUpstash) {
    if (!memHandleSet.has(h)) memHandleSet.set(h, new Set());
    memHandleSet.get(h)!.add(citizenId);
    if (gifter) {
      if (!memCitizenUnlockers.has(citizenId)) memCitizenUnlockers.set(citizenId, new Set());
      memCitizenUnlockers.get(citizenId)!.add(gifter);
      if (!memGiftAttribution.has(citizenId)) memGiftAttribution.set(citizenId, gifter);
    }
    return;
  }
  await upstash(["SADD", KEY(`h:${h}`), String(citizenId)]);
  if (gifter) {
    await upstash(["SADD", KEY(`c:${citizenId}`), gifter]);
    await upstash(["SET", KEY(`gift:${citizenId}`), gifter, "NX"]);
  }
}

export async function isCitizenGifted(citizenId: number): Promise<{ gifted: boolean; gifter?: string }> {
  if (!hasUpstash) {
    const gifter = memGiftAttribution.get(citizenId);
    return gifter ? { gifted: true, gifter } : { gifted: false };
  }
  try {
    const r = (await upstash(["GET", KEY(`gift:${citizenId}`)])) as string | null;
    return r ? { gifted: true, gifter: r } : { gifted: false };
  } catch {
    return { gifted: false };
  }
}

export async function citizenUnlockers(citizenId: number): Promise<string[]> {
  if (!hasUpstash) {
    return Array.from(memCitizenUnlockers.get(citizenId) ?? []);
  }
  try {
    const r = (await upstash(["SMEMBERS", KEY(`c:${citizenId}`)])) as string[];
    return r ?? [];
  } catch {
    return [];
  }
}
