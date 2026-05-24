/**
 * Defender tick on page visit.
 *
 * Belt-and-braces backstop for the sweep-bounty cron. When a user
 * visits /hold-the-line and the last defender scan was >5 min ago,
 * fire a fresh runDefenderScan in the background so the leaderboard
 * + their own newly-placed bid show up by the time the page paints.
 *
 * Why this exists:
 *   The Vercel Hobby cron only fires once daily at 01:07 UTC. The
 *   GH-Actions external pinger (added in same PR) brings cadence to
 *   ~30 min. This page-visit trigger guarantees a fresh scan within
 *   5 min of *any* user actually looking at the page — which is when
 *   they're going to ask "where's my bid?". Cost is one extra scan
 *   per 5-min window per user, dedupe-gated through Upstash, safe to
 *   over-fire (everything is SETNX-idempotent in runDefenderScan).
 *
 * Cost: one Upstash GET + (sometimes) one runDefenderScan call.
 * The scan itself is one OpenSea offers GET + per-offer Upstash SETs.
 * On the freelons collection with ≤50 offers per page, this is
 * usually <1s — but we make it fire-and-forget either way so the
 * page never blocks waiting for it.
 */

import { runDefenderScan } from "@/lib/defender-scan";

const KEY_LAST_VISIT_TICK = "freelon:defender:last-visit-tick";
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

async function upstashGet(key: string): Promise<string | null> {
  if (!hasUpstash) return null;
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    const r = await fetch(`${url}/GET/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { result: string | null };
    return j.result ?? null;
  } catch {
    return null;
  }
}

async function upstashSet(key: string, val: string, ttlSec: number): Promise<void> {
  if (!hasUpstash) return;
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    await fetch(
      `${url}/SETEX/${encodeURIComponent(key)}/${ttlSec}/${encodeURIComponent(val)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
  } catch {/* non-fatal */}
}

/**
 * Fire-and-forget. Returns immediately; the scan runs in the background.
 *
 * Call from server components that want fresh defender data without
 * waiting for the cron. Multiple concurrent callers within the same
 * 5-min window become no-ops (the first one wins the lock).
 */
export function tickDefenderOnVisitFireAndForget(): void {
  // Promise intentionally not awaited — fire-and-forget.
  void (async () => {
    try {
      const lastRaw = await upstashGet(KEY_LAST_VISIT_TICK);
      const lastTs = lastRaw ? Number(lastRaw) : 0;
      const now = Date.now();
      if (lastTs > 0 && now - lastTs < MIN_INTERVAL_MS) {
        return; // someone else ticked it recently
      }
      // Mark the lock BEFORE running so a flood of concurrent visits
      // don't all race past the gate.
      await upstashSet(KEY_LAST_VISIT_TICK, String(now), 600); // 10-min TTL
      await runDefenderScan();
    } catch {/* non-fatal */}
  })();
}
