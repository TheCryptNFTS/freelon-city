/**
 * Server-side daily-claim ledger. Keyed by lowercased wallet address.
 * One claim per UTC day. In-memory for dev, Upstash REST in prod.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const memory = new Map<string, string>(); // addr → YYYY-MM-DD

const KEY = (addr: string) => `freelon:claim:v1:${addr.toLowerCase()}`;

export function todayUTC(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export async function getLastClaim(addr: string): Promise<string | null> {
  if (!hasUpstash) return memory.get(addr.toLowerCase()) ?? null;
  const raw = (await upstash(["GET", KEY(addr)])) as string | null;
  return raw ?? null;
}

export async function setLastClaim(addr: string, day: string): Promise<void> {
  if (!hasUpstash) {
    memory.set(addr.toLowerCase(), day);
    return;
  }
  // 48h TTL — we only need today + yesterday to compute streaks. Stops
  // unbounded growth of claim keys.
  await upstash(["SET", KEY(addr), day, "EX", "172800"]);
}

export async function canClaimToday(addr: string): Promise<boolean> {
  const last = await getLastClaim(addr);
  return last !== todayUTC();
}

/**
 * Atomic claim attempt. Returns true if this caller won the race and
 * should proceed to credit hex; false if another request already claimed
 * today for this wallet. Uses Redis SET NX so two concurrent POSTs
 * cannot both pass.
 *
 * Closes the daily-claim TOCTOU: canClaimToday() + setLastClaim() was
 * not atomic — two concurrent claims could both see "not yet claimed"
 * and both credit 10⬡, doubling the daily payout.
 */
export async function tryClaimToday(addr: string): Promise<boolean> {
  const day = todayUTC();
  if (!hasUpstash) {
    const w = addr.toLowerCase();
    if (memory.get(w) === day) return false;
    memory.set(w, day);
    return true;
  }
  try {
    // SET NX EX 172800 — only sets if key doesn't already match.
    // Returns "OK" on success, null when key already existed.
    const res = await upstash(["SET", KEY(addr), day, "NX", "EX", "172800"]);
    if (res === "OK") return true;
    // Key existed — check if it's today's claim or a stale value
    const cur = (await upstash(["GET", KEY(addr)])) as string | null;
    if (cur === day) return false;
    // Stale (yesterday's) value — overwrite atomically with today and proceed
    await upstash(["SET", KEY(addr), day, "EX", "172800"]);
    return true;
  } catch {
    // On Upstash failure, fall back to single-attempt semantics. Won't
    // double-credit because the credit path itself fails too.
    return false;
  }
}

/**
 * Release today's claim lock so the caller can retry. 2026-05-29 — used by
 * the claim route to roll back ONLY when the hex credit failed before any
 * money was paid out (i.e. nothing credited yet). Must never be called after
 * a successful credit, or the wallet could be credited twice on retry.
 *
 * Best-effort: a failed release just means the user can't retry until the
 * 48h TTL expires — annoying, never a double-credit.
 */
export async function releaseClaimToday(addr: string): Promise<void> {
  if (!hasUpstash) {
    memory.delete(addr.toLowerCase());
    return;
  }
  try {
    await upstash(["DEL", KEY(addr)]);
  } catch {
    /* best-effort — leave the lock; user retries after TTL */
  }
}
