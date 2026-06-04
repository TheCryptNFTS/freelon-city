/**
 * Referrer ledger. Tracks who invited whom into FREELON CITY.
 *
 * Upstash keys:
 *   freelon:ref:by-joiner:<handle>   = Referral (one row per joiner — first ref wins)
 *   freelon:ref:by-referrer:<handle> = JSON array of Referral (append-only)
 *
 * In-memory fallback when no Upstash env. Handles are lowercased.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type Referral = {
  referrer: string;       // X handle of inviter (lowercased)
  joiner: string;         // X handle of new user (lowercased)
  joinerAddress?: string; // populated when X-verified
  ts: number;
  rewarded: boolean;      // true once both parties credited
};

const memoryByJoiner = new Map<string, Referral>();
const memoryByReferrer = new Map<string, Referral[]>();

const KEY_JOINER = (handle: string) =>
  `freelon:ref:by-joiner:${handle.toLowerCase()}`;
const KEY_REFERRER = (handle: string) =>
  `freelon:ref:by-referrer:${handle.toLowerCase()}`;

export async function getReferral(joiner: string): Promise<Referral | null> {
  const k = joiner.toLowerCase();
  if (!hasUpstash) return memoryByJoiner.get(k) ?? null;
  try {
    const raw = (await upstash(["GET", KEY_JOINER(k)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as Referral;
  } catch {
    return null;
  }
}

export async function listInvitedBy(referrer: string): Promise<Referral[]> {
  const k = referrer.toLowerCase();
  if (!hasUpstash) return memoryByReferrer.get(k) ?? [];
  try {
    const raw = (await upstash(["GET", KEY_REFERRER(k)])) as string | null;
    if (!raw) return [];
    return JSON.parse(raw) as Referral[];
  } catch {
    return [];
  }
}

export async function setReferrer(
  joiner: string,
  referrer: string,
): Promise<Referral | null> {
  const j = joiner.toLowerCase();
  const r = referrer.toLowerCase();
  if (!j || !r || j === r) return null;

  const row: Referral = {
    referrer: r,
    joiner: j,
    ts: Date.now(),
    rewarded: false,
  };

  if (!hasUpstash) {
    // First-ref-wins, atomic in JS single-thread land.
    if (memoryByJoiner.has(j)) return null;
    memoryByJoiner.set(j, row);
    const arr = memoryByReferrer.get(r) ?? [];
    arr.push(row);
    memoryByReferrer.set(r, arr);
    return row;
  }

  try {
    // Atomic first-ref-wins via SET NX. Two concurrent setReferrer calls
    // cannot both win — only one's NX succeeds, the other returns null.
    // Closes the "referral hijack" race where two concurrent requests
    // both passed the getReferral() check and overwrote each other.
    const claim = await upstash(["SET", KEY_JOINER(j), JSON.stringify(row), "NX"]);
    if (claim !== "OK") return null;
    // Append to referrer's invited list. Not atomic, but safe — at worst
    // we'd duplicate or drop one entry under heavy contention, and the
    // authoritative joiner→referrer mapping is already locked above.
    const prev = (await upstash(["GET", KEY_REFERRER(r)])) as string | null;
    const arr: Referral[] = prev ? (JSON.parse(prev) as Referral[]) : [];
    arr.push(row);
    await upstash(["SET", KEY_REFERRER(r), JSON.stringify(arr)]);
    return row;
  } catch {
    return null;
  }
}

export async function markRewarded(joiner: string): Promise<void> {
  const j = joiner.toLowerCase();
  const row = await getReferral(j);
  if (!row || row.rewarded) return;
  row.rewarded = true;

  // EARN PREMIUM RUNS — the REFERRER earns runs for bringing a real holder.
  // Best-effort + idempotent (claimEarnedRuns SET-NX on the joiner key).
  try {
    const { claimEarnedRuns } = await import("@/lib/missions/earn-runs");
    await claimEarnedRuns({ wallet: row.referrer, reason: "referral", eventKey: `referral:${j}` });
  } catch { /* non-fatal — never block the referral reward on the run grant */ }

  if (!hasUpstash) {
    memoryByJoiner.set(j, row);
    const arr = memoryByReferrer.get(row.referrer) ?? [];
    const idx = arr.findIndex((x) => x.joiner === j);
    if (idx >= 0) arr[idx] = row;
    memoryByReferrer.set(row.referrer, arr);
    return;
  }

  try {
    await upstash(["SET", KEY_JOINER(j), JSON.stringify(row)]);
    const prev = (await upstash(["GET", KEY_REFERRER(row.referrer)])) as
      | string
      | null;
    const arr: Referral[] = prev ? (JSON.parse(prev) as Referral[]) : [];
    const idx = arr.findIndex((x) => x.joiner === j);
    if (idx >= 0) {
      arr[idx] = row;
      await upstash([
        "SET",
        KEY_REFERRER(row.referrer),
        JSON.stringify(arr),
      ]);
    }
  } catch {
    // best-effort
  }
}
