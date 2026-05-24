/**
 * Sweep burst — "the floor just got crushed, the city has to know."
 *
 * Sister system to sales-pulse (which posts a single-top-sale digest
 * every 4h). Sweep burst fires when ≥SWEEP_BURST_MIN citizens sold
 * inside the same pulse window: composes a 3×2 grid image of the top
 * sales, posts to X with that media, and broadcasts an in-app
 * notification to the top ~100 holders so the FOMO loop closes.
 *
 * Founder spec (2026-05-24):
 *   - Threshold: 5+ citizens swept in 4h.
 *   - Image: 3×2 grid of 6 hero faces.
 *   - X post: text + image.
 *   - In-app: notify all holders we can reach (capped at top-100 today;
 *     OpenSea holders endpoint returns ~100 max per page).
 *
 * Why a separate gate from sales-pulse:
 *   sales-pulse fires every 4h regardless of count (its hook is the
 *   top sale). sweep-burst should ALSO fire when the same 4h window
 *   crosses the burst threshold — so they share the 4h cadence but
 *   not the gate key (or they'd silence each other).
 */

import { heroImageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import { postTweet, postingCapable, uploadMedia } from "@/lib/x-autopost";
import { notify } from "@/lib/notify";
import type { PulseSale } from "@/lib/sales-pulse";

const BURST_THRESHOLD = 5;
const BURST_INTERVAL_MS = 4 * 60 * 60 * 1000; // share 4h cadence with sales-pulse
const KEY_LAST = "freelon:sweep-burst:last";
const KEY_TWEETED = (tx: string, tokenId: string | number) =>
  `freelon:sweep-burst:event:${tx}:${tokenId}`;
const KEY_NOTIFIED = (wallet: string, burstId: string) =>
  `freelon:sweep-burst:notified:${burstId}:${wallet}`;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.freeloncity.com";

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

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

export type SweepBurstResult = {
  ok: boolean;
  reason: string;
  posted?: boolean;
  count?: number;
  volumeEth?: number;
  tweetId?: string;
  notified?: number;
};

function trimEth(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

/** Top-N holders, capped by OpenSea's 100-per-page limit. */
async function fetchTopHolders(): Promise<Array<{ address: string; count: number }>> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return [];
  try {
    const r = await fetch(
      "https://api.opensea.io/api/v2/collections/freelons/holders?limit=100",
      {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
      },
    );
    if (!r.ok) return [];
    type RawHolder = { address?: string; quantity?: number };
    const d = (await r.json()) as { holders?: RawHolder[] };
    return (d.holders || [])
      .filter((h): h is { address: string; quantity: number } =>
        typeof h.address === "string" && typeof h.quantity === "number",
      )
      .map((h) => ({ address: h.address.toLowerCase(), count: h.quantity }));
  } catch {
    return [];
  }
}

/**
 * Run the burst against a freshly-collected batch of sales from the
 * current cron run. Returns a structured result for the cron response.
 *
 * Safe to call alongside runSalesPulse — they use independent gates +
 * dedupe keys so they don't silence each other.
 */
export async function runSweepBurst(sales: PulseSale[]): Promise<SweepBurstResult> {
  if (!postingCapable()) {
    return { ok: false, reason: "x_creds_missing" };
  }

  // ── 1. 4h gate (independent from sales-pulse) ─────────────────
  const now = Date.now();
  if (hasUpstash) {
    try {
      const last = (await upstash(["GET", KEY_LAST])) as string | null;
      if (last) {
        const lastMs = Number(last);
        if (Number.isFinite(lastMs) && now - lastMs < BURST_INTERVAL_MS) {
          return { ok: true, reason: "gated", posted: false };
        }
      }
    } catch {
      return { ok: false, reason: "gate_check_failed" };
    }
  }

  if (sales.length < BURST_THRESHOLD) {
    return { ok: true, reason: "below_threshold", posted: false, count: sales.length };
  }

  // ── 2. Dedupe against prior bursts (per-tx) ───────────────────
  const fresh: PulseSale[] = [];
  for (const s of sales) {
    if (!s.tx || !s.tokenId || !(s.priceEth > 0)) continue;
    if (hasUpstash) {
      try {
        const seen = (await upstash(["GET", KEY_TWEETED(s.tx, s.tokenId)])) as string | null;
        if (seen) continue;
      } catch {/* dedupe miss is acceptable; SETNX below catches double-post */}
    }
    fresh.push(s);
  }

  if (fresh.length < BURST_THRESHOLD) {
    return { ok: true, reason: "fresh_below_threshold", posted: false, count: fresh.length };
  }

  // ── 3. Pick top-6 by price for the image, but compute headline
  //     count + volume from the full fresh batch ──────────────────
  const sorted = [...fresh].sort((a, b) => b.priceEth - a.priceEth);
  const topSix = sorted.slice(0, 6);
  const totalCount = fresh.length;
  const volumeEth = fresh.reduce((a, s) => a + s.priceEth, 0);

  // ── 4. Compose tweet text ─────────────────────────────────────
  // Burst-id is deterministic from the top tx so retries of the same
  // window pick the same id (idempotent notification keys).
  const burstId = `${topSix[0].tx.slice(0, 10)}-${topSix[0].tokenId}`;
  const topCit = getCitizen(topSix[0].tokenId);
  const topCivName = topCit
    ? (CIVILIZATIONS as Record<string, { name: string }>)[topCit.civilization]?.name
    : null;

  const lines = [
    `⬡ SWEEP BURST · the floor just moved.`,
    ``,
    `${totalCount} citizen${totalCount === 1 ? "" : "s"} swept · ${trimEth(volumeEth)} Ξ volume`,
    `Top sale · #${String(topSix[0].tokenId).padStart(4, "0")}${topCivName ? ` · ${topCivName.toUpperCase()}` : ""} · ${trimEth(topSix[0].priceEth)} Ξ`,
    ``,
    `The city remembers what moves through it.`,
    `#FREELONCITY #404HEXNOTFOUND`,
    `${SITE}`,
  ];
  const text = lines.join("\n");

  // ── 5. Upload composite OG image ──────────────────────────────
  const idsParam = topSix.map((s) => s.tokenId).join(",");
  const ogUrl = `${SITE}/api/og/sweep-burst?ids=${idsParam}&total=${trimEth(volumeEth)}&count=${totalCount}`;
  let mediaId: string | null = null;
  try {
    mediaId = await uploadMedia(ogUrl);
  } catch {/* fall through to text-only */}

  // ── 6. Post tweet ─────────────────────────────────────────────
  const post = await postTweet(text, mediaId ? [mediaId] : undefined);
  if (!post.ok) {
    // Don't refresh the gate — try again next cron run.
    return { ok: false, reason: `post_failed_${post.reason}`, count: fresh.length };
  }

  // ── 7. Broadcast in-app notification to top holders ────────────
  let notified = 0;
  try {
    const holders = await fetchTopHolders();
    const body = `⬡ ${totalCount} citizens just got swept · ${trimEth(volumeEth)} Ξ · the city moved`;
    const href = `/`;
    // Sequential to keep Upstash request count predictable; ~100 wallets
    // × ~50ms each = ~5s total. Cron has plenty of budget.
    for (const h of holders) {
      try {
        const r = await notify({
          wallet: h.address,
          eventKey: `sweep-burst:${burstId}:${h.address}`,
          kind: "sweep-burst",
          body,
          href,
        });
        if (r.inboxed) notified++;
        // Idempotency belt: even if notify() didn't dedupe, our SETNX here
        // ensures we never broadcast twice to the same wallet for this burst.
        if (hasUpstash) {
          try {
            await upstash(["SET", KEY_NOTIFIED(h.address, burstId), "1", "NX", "EX", "604800"]);
          } catch {/* non-fatal */}
        }
      } catch {/* per-wallet failure is non-fatal */}
    }
  } catch {/* broadcast failure is non-fatal — the X post already shipped */}

  // ── 8. Refresh gate + dedupe ─────────────────────────────────
  if (hasUpstash) {
    try {
      await upstash(["SET", KEY_LAST, String(now), "EX", "604800"]);
      await Promise.all(
        fresh.map((s) =>
          upstash(["SETEX", KEY_TWEETED(s.tx, s.tokenId), "2592000", "1"]).catch(() => {}),
        ),
      );
    } catch {/* non-fatal */}
  }

  return {
    ok: true,
    reason: "posted",
    posted: true,
    count: fresh.length,
    volumeEth,
    tweetId: post.id,
    notified,
  };
}
