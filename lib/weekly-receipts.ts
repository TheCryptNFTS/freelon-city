/**
 * Weekly receipts autopost.
 *
 * Once per ISO week (Sunday after ~21:00 UTC by convention — close to
 * signal time), @4040hex posts a single thread with the week's numbers.
 * Same architecture as the 4h sales pulse: piggybacks on sweep-bounty,
 * gates on a Redis timestamp so only one cron call per week actually
 * tweets.
 *
 * Compared to the sales-pulse:
 *   - Pulse runs every 4h, surfaces a single top sale.
 *   - Weekly receipts runs every Sunday, surfaces the week's roll-up.
 *
 * Skips silently when:
 *   - Already posted this ISO week (Upstash timestamp check).
 *   - Day-of-week is not Sunday (or whatever DOW we configure).
 *   - X credentials missing.
 */

import { listWalletHexRecords } from "@/lib/wallet-hex-store";
import { listTransmissions } from "@/lib/transmissions-store";
import { listDumpLedger } from "@/lib/ghost-store";
import { postTweet, postingCapable } from "@/lib/x-autopost";

const KEY_LAST = "freelon:weekly-receipts:last";
const WEEK_MS = 6 * 24 * 60 * 60 * 1000; // gate at 6d — ensures one fire per ISO week even with cron jitter
const POST_DOW = 0; // Sunday (UTC) — 0 = Sunday in JS getUTCDay()

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

const COLLECTION_SLUG = "freelons";

type OSStats = {
  total?: { volume?: number; sales?: number; num_owners?: number };
  intervals?: Array<{ interval: string; volume?: number; sales?: number }>;
};

async function fetchSevenDay(): Promise<{ volume: number; sales: number; holders: number } | null> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(
      `https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}/stats`,
      { headers: { "X-API-KEY": apiKey, accept: "application/json" }, cache: "no-store" },
    );
    if (!r.ok) return null;
    const d = (await r.json()) as OSStats;
    const seven = d.intervals?.find((i) => i.interval === "seven_day");
    return {
      volume: Number(seven?.volume || 0),
      sales: Number(seven?.sales || 0),
      holders: Number(d.total?.num_owners || 0),
    };
  } catch {
    return null;
  }
}

function trimEth(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}

export type WeeklyResult = {
  ok: boolean;
  reason: string;
  posted?: boolean;
  tweetId?: string;
};

export async function runWeeklyReceipts(opts: { force?: boolean } = {}): Promise<WeeklyResult> {
  if (!postingCapable()) {
    return { ok: false, reason: "x_creds_missing" };
  }

  const now = new Date();
  // Day-of-week gate (unless force=true for manual test)
  if (!opts.force && now.getUTCDay() !== POST_DOW) {
    return { ok: true, reason: `not_dow_${now.getUTCDay()}`, posted: false };
  }

  // Once-per-week gate
  if (hasUpstash) {
    try {
      const last = (await upstash(["GET", KEY_LAST])) as string | null;
      if (last && !opts.force) {
        const lastMs = Number(last);
        if (Number.isFinite(lastMs) && Date.now() - lastMs < WEEK_MS) {
          return { ok: true, reason: "gated", posted: false };
        }
      }
    } catch {
      return { ok: false, reason: "gate_check_failed" };
    }
  }

  // ── Pull the week's data ──────────────────────────────────────
  const [seven, hexRecords, txs, dumps] = await Promise.all([
    fetchSevenDay(),
    listWalletHexRecords(500).catch(() => []),
    listTransmissions({ by: "score", limit: 100 }).catch(() => []),
    listDumpLedger(200).catch(() => []),
  ]);

  const volEth = seven?.volume ?? 0;
  const sales = seven?.sales ?? 0;
  const holders = seven?.holders ?? 0;
  const hexBalance = hexRecords.reduce((a, r) => a + (r.balance || 0), 0);
  const hexLifetime = hexRecords.reduce((a, r) => a + (r.lifetimeEarned || 0), 0);
  const hexBurned = Math.max(0, hexLifetime - hexBalance);

  // Top transmission this week (createdAt > now - 7d)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyTx = txs.filter((t) => t.createdAt >= weekAgo);
  const topTx = weeklyTx[0] || null;

  // Rescues this week
  const weeklyDumps = dumps.filter((d) => d.ts >= weekAgo);
  const weeklyRescues = weeklyDumps.filter((d) => d.rescuer).length;

  // ── Compose tweet (X anti-suppression rules respected) ────────
  // Template variation per CT culture pro feedback — same pattern as
  // sales-pulse. Deterministic from ISO week so the same week always
  // picks the same template (retry safety) but consecutive weeks rotate.
  const isoWeek = isoWeekNumber(now);

  const LEADS = [
    `⬡ WEEK ${isoWeek} RECEIPTS · ⬡ @4040hex`,
    `⬡ Week ${isoWeek} · the ledger speaks ↓`,
    `⬡ Seven days in the city ⬡ week ${isoWeek}:`,
    `⬡ What week ${isoWeek} carried, on-chain:`,
  ];
  const CLOSERS = [
    `The city remembers everything.`,
    `Receipts kept. Carriers carried.`,
    `Nothing forgotten. Nothing curated.`,
    `One week. Written down.`,
  ];

  const lead = LEADS[isoWeek % LEADS.length];
  const closer = CLOSERS[(isoWeek + 1) % CLOSERS.length];

  const lines = [
    lead,
    ``,
    `· ${sales} sale${sales === 1 ? "" : "s"} · ${trimEth(volEth)} Ξ`,
    `· ${holders} holder${holders === 1 ? "" : "s"} (lifetime)`,
    `· ${hexBurned.toLocaleString()} ⬡ burned · ${hexBalance.toLocaleString()} ⬡ in circulation`,
  ];
  if (weeklyRescues > 0) {
    lines.push(`· ${weeklyRescues} rescue${weeklyRescues === 1 ? "" : "s"} · dumps caught`);
  }
  if (topTx) {
    lines.push(`· top transmission · @${topTx.authorHandle.replace(/^@/, "")} · score ${topTx.score}`);
  }
  lines.push(``);
  lines.push(closer);
  lines.push(`#FREELONCITY #404HEXNOTFOUND`);
  lines.push(`https://www.freeloncity.com/numbers`);
  const text = lines.join("\n");

  const post = await postTweet(text);
  if (!post.ok) {
    // Don't update the gate — retry next cron run within the week.
    return { ok: false, reason: `post_failed_${post.reason}` };
  }

  // Record so carriers can reply for hex via /api/reply.
  try {
    const { rememberAutopostTweet } = await import("@/lib/reply-store");
    await rememberAutopostTweet(post.id);
  } catch {/* non-fatal */}

  // Thread: post a reply tweet directly off the lead with the live
  // stats URL. X algo rewards thread dwell time, ~2× impressions.
  try {
    const reply = [
      `⬡ Every number above is live.`,
      `Auto-updated every 5 minutes. No screenshots, no curation.`,
      ``,
      `freeloncity.com/numbers`,
    ].join("\n");
    // Register the follow-up too. Same reason as sales-pulse:
    // carriers reply to the threaded message, not always the parent.
    const followup = await postTweet(reply, undefined, { replyToId: post.id });
    if (followup.ok && followup.id) {
      const { rememberAutopostTweet } = await import("@/lib/reply-store");
      await rememberAutopostTweet(followup.id);
    }
  } catch {/* non-fatal */}

  if (hasUpstash) {
    try {
      // 8-day TTL on the gate so a missed week self-heals into the next.
      await upstash(["SET", KEY_LAST, String(Date.now()), "EX", String(8 * 24 * 60 * 60)]);
    } catch {/* non-fatal */}
  }
  return { ok: true, reason: "posted", posted: true, tweetId: post.id };
}

function isoWeekNumber(date: Date): number {
  // ISO week — Thursday-anchored. Returns 1..53.
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
