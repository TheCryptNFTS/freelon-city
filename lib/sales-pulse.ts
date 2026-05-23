/**
 * Sales pulse autopost.
 *
 * Fires once every PULSE_INTERVAL_HOURS (4h). Called from inside the
 * sweep-bounty cron (which already pulls OpenSea sales every 30 min)
 * so we don't spend a separate cron slot.
 *
 * Behaviour:
 *   1. Gate on freelon:autopost:last timestamp. If <4h since last
 *      attempt, return early.
 *   2. Take the sales array the cron already collected this run,
 *      strip those we've already tweeted about (per-tx dedupe), and
 *      bail if 0 unseen sales (silent — "skip on quiet hours").
 *   3. Pick the top sale by ETH price as the visual hook. Compose a
 *      digest tweet (count + volume + top-sale line). Optionally tag
 *      the buyer if their wallet has a verified X handle.
 *   4. Download the citizen image (5s timeout), upload to X, post
 *      tweet with media. On failure, fall back to text-only post so
 *      the digest still ships.
 *   5. On any post success: mark every sale tx in this batch as
 *      tweeted, refresh the timestamp gate.
 *
 * Failure is silent — autopost never blocks the cron's primary work
 * (sweep credits, rescue detection, notifications).
 */

import { getCitizen } from "@/lib/citizens";
import { heroImageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getXVerification } from "@/lib/x-store";
import { postTweet, postingCapable, uploadMedia } from "@/lib/x-autopost";

const PULSE_INTERVAL_MS = 4 * 60 * 60 * 1000;
const KEY_LAST = "freelon:autopost:last";
const KEY_TWEETED = (tx: string, tokenId: string | number) =>
  `freelon:autopost:event:${tx}:${tokenId}`;

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

export type PulseSale = {
  tx: string;
  tokenId: number;
  buyer: string;
  priceEth: number;
  ts: number;
};

export type PulseResult = {
  ok: boolean;
  reason: string;
  posted?: boolean;
  count?: number;
  topTokenId?: number;
  topPriceEth?: number;
  tweetId?: string;
};

function trimEth(n: number): string {
  return parseFloat(n.toFixed(4)).toString();
}

function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

/**
 * Compose the digest text for a pulse window.
 * X rules respected: leads with ⬡ (not link, not @mention), URL on last line.
 */
function composeText(input: {
  count: number;
  volumeEth: number;
  top: PulseSale;
  topCivName: string | null;
  topBuyerHandle: string | null;
}): string {
  const { count, volumeEth, top, topCivName, topBuyerHandle } = input;
  const id4 = top.tokenId.toString().padStart(4, "0");
  const buyerLine = topBuyerHandle
    ? ` · to @${topBuyerHandle}`
    : "";
  const civSlug = topCivName ? ` · ${topCivName.toUpperCase()}` : "";
  const lines = [
    `⬡ 4H SIGNAL PULSE`,
    ``,
    `${count} citizen${count === 1 ? "" : "s"} · ${trimEth(volumeEth)} Ξ volume`,
    `Top · #${id4}${civSlug} · ${trimEth(top.priceEth)} Ξ${buyerLine}`,
    ``,
    `The city keeps moving.`,
    `#FREELONCITY #404HEXNOTFOUND`,
    `https://www.freeloncity.com/citizens/${top.tokenId}`,
  ];
  return lines.join("\n");
}

/**
 * Run the pulse against a freshly-collected batch of sales from the
 * current cron run. Returns a structured result so the cron response
 * can include it for debugging.
 */
export async function runSalesPulse(sales: PulseSale[]): Promise<PulseResult> {
  if (!postingCapable()) {
    return { ok: false, reason: "x_creds_missing" };
  }

  // ── 1. 4h gate ────────────────────────────────────────────────
  const now = Date.now();
  if (hasUpstash) {
    try {
      const last = (await upstash(["GET", KEY_LAST])) as string | null;
      if (last) {
        const lastMs = Number(last);
        if (Number.isFinite(lastMs) && now - lastMs < PULSE_INTERVAL_MS) {
          return { ok: true, reason: "gated", posted: false };
        }
      }
    } catch {
      // If Upstash is down we'd rather skip than risk double-posting
      return { ok: false, reason: "gate_check_failed" };
    }
  }

  if (sales.length === 0) {
    return { ok: true, reason: "no_sales", posted: false };
  }

  // ── 2. Dedupe against prior tweets ────────────────────────────
  const fresh: PulseSale[] = [];
  for (const s of sales) {
    if (!s.tx || !s.tokenId || !(s.priceEth > 0)) continue;
    if (hasUpstash) {
      try {
        const seen = (await upstash(["GET", KEY_TWEETED(s.tx, s.tokenId)])) as string | null;
        if (seen) continue;
      } catch {
        // Dedupe failure → safer to skip than risk duplicate post
        continue;
      }
    }
    fresh.push(s);
  }
  if (fresh.length === 0) {
    return { ok: true, reason: "all_already_tweeted", posted: false };
  }

  // ── 3. Pick top sale + compose tweet ──────────────────────────
  fresh.sort((a, b) => b.priceEth - a.priceEth);
  const top = fresh[0];
  const volumeEth = fresh.reduce((acc, s) => acc + s.priceEth, 0);

  const citizen = getCitizen(top.tokenId);
  const civDef = citizen
    ? (CIVILIZATIONS as Record<string, { name: string }>)[citizen.civilization]
    : null;
  const topCivName = civDef?.name || null;

  // Optional carrier tag — only if buyer has a verified X handle.
  let topBuyerHandle: string | null = null;
  try {
    const v = await getXVerification(top.buyer);
    if (v && v.xHandle) {
      topBuyerHandle = v.xHandle.replace(/^@/, "");
    }
  } catch {/* non-fatal */}

  const text = composeText({
    count: fresh.length,
    volumeEth,
    top,
    topCivName,
    topBuyerHandle,
  });

  // ── 4. Upload media + post ────────────────────────────────────
  const imgUrl = heroImageUrl(top.tokenId);
  let mediaId: string | null = null;
  try {
    mediaId = await uploadMedia(imgUrl);
  } catch {/* fall through to text-only */}

  const post = await postTweet(text, mediaId ? [mediaId] : undefined);
  if (!post.ok) {
    // Don't refresh the gate — try again next cron run (still within 4h
    // window since gate wasn't set). Keeps us trying through transient
    // X outages.
    return { ok: false, reason: `post_failed_${post.reason}` };
  }

  // Record the tweet ID so the reply route knows it was ours — carriers
  // who reply to this post earn hex via /api/reply.
  try {
    const { rememberAutopostTweet } = await import("@/lib/reply-store");
    await rememberAutopostTweet(post.id);
  } catch {/* non-fatal */}

  // ── THREAD: post a reply tweet directly off the lead. X algo gives
  // thread dwell time a boost; a second tweet doubles impressions on
  // average. Format: a single-line CTA pointing carriers at the city.
  // Failure is non-fatal — the lead post already credits as success.
  try {
    const ctaLines = [
      `⬡ Reply to this post to earn hex —`,
      `first 10 replies in 30 min get 2× the bounty.`,
      ``,
      `freeloncity.com/sync`,
    ];
    await postTweet(ctaLines.join("\n"), undefined, { replyToId: post.id });
  } catch {/* non-fatal */}

  // ── 5. Refresh gate + dedupe ─────────────────────────────────
  if (hasUpstash) {
    try {
      // 7-day TTL on the gate so a stale key can't ever permanently silence us
      await upstash(["SET", KEY_LAST, String(now), "EX", "604800"]);
      // Mark every fresh tx as tweeted (30-day TTL covers retry windows)
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
    topTokenId: top.tokenId,
    topPriceEth: top.priceEth,
    tweetId: post.id,
  };
}
