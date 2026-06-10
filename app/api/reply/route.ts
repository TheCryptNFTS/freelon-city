/**
 * POST /api/reply
 * Body: { addr: "0x…", replyUrl: "https://x.com/<handle>/status/<id>" }
 *
 * Carrier submits the URL of their reply to a @4040hex post. We verify:
 *   1. Their session has PROVEN control of the payout wallet (signature
 *      via /api/x/prove — bind alone is never payment-grade).
 *   2. The reply URL parses to a tweet ID.
 *   3. X API confirms: tweet exists, author = bound handle, in_reply_to
 *      matches a tweet ID we autoposted in the last 30 days.
 *   4. Carrier hasn't already submitted this replyId.
 *   5. Carrier is under the daily reply cap.
 *
 * Pays out:
 *   - Base REPLY_BOUNTY (15 ⬡)
 *   - 2× if landed inside REPLY_BURST_WINDOW_MIN of the parent AND
 *     among the first REPLY_BURST_FIRST_N replies
 *   - Engagement bonus (+REPLY_ENGAGEMENT_BONUS) deferred — paid 24h
 *     later by a cron scan if the reply earned ≥ REPLY_ENGAGEMENT_THRESHOLD
 *     likes
 */
import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isSameOrigin, requireProvenWallet, getSessionFromRequest } from "@/lib/x-session";
import { isValidAddress } from "@/lib/wallet-tokens";
import { creditWalletHex } from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";
import {
  isAutopostedTweet,
  parentPostedAt,
  replyCountForParent,
  dailyReplyCount,
  recordReply,
  getReply,
  type ReplyRecord,
} from "@/lib/reply-store";

export const dynamic = "force-dynamic";

const TWEET_URL_RE = /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,32})\/status\/(\d{5,25})/i;

type TweetLookup = {
  ok: boolean;
  authorHandle?: string;
  inReplyToId?: string;
  text?: string;
  reason?: string;
};

/** Calls X v2 GET /2/tweets/:id with bearer auth. Returns parsed fields
 *  or ok=false with a reason for the error UI. */
async function lookupTweet(tweetId: string): Promise<TweetLookup> {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) return { ok: false, reason: "no_bearer_token_configured" };
  try {
    const u = new URL(`https://api.x.com/2/tweets/${encodeURIComponent(tweetId)}`);
    u.searchParams.set("tweet.fields", "author_id,referenced_tweets,in_reply_to_user_id,text");
    u.searchParams.set("expansions", "author_id,in_reply_to_user_id");
    u.searchParams.set("user.fields", "username");
    const r = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${bearer}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!r.ok) return { ok: false, reason: `http_${r.status}` };
    const j = (await r.json()) as {
      data?: {
        author_id?: string;
        referenced_tweets?: Array<{ type: string; id: string }>;
        text?: string;
      };
      includes?: { users?: Array<{ id: string; username: string }> };
    };
    if (!j.data) return { ok: false, reason: "tweet_not_found" };
    const replyRef = j.data.referenced_tweets?.find((r) => r.type === "replied_to");
    const author = j.includes?.users?.find((u) => u.id === j.data?.author_id);
    return {
      ok: true,
      authorHandle: author?.username?.toLowerCase(),
      inReplyToId: replyRef?.id,
      text: j.data.text,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message.slice(0, 40) : "unknown" };
  }
}

export async function POST(req: Request) {
  const rl = await limit(req, "reply:submit", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { addr?: string; replyUrl?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = (body.addr || "").toLowerCase();
  const replyUrl = (body.replyUrl || "").trim();
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  // ⬡ credits to a wallet require a PROVEN wallet (one-time signature via
  // /api/x/prove). `bind` is attacker-chooseable at OAuth start — gating on it
  // let one X account direct reply bounties at arbitrary wallets across
  // rebinds (HEX_ECONOMY_RED_TEAM rule 5). Closed 2026-06-10.
  if (!requireProvenWallet(req, addr)) {
    return NextResponse.json({ error: "wallet_proof_required" }, { status: 401 });
  }
  const session = getSessionFromRequest(req);
  const boundHandle = (session?.xHandle || "").toLowerCase().replace(/^@/, "");
  if (!boundHandle) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }

  const m = replyUrl.match(TWEET_URL_RE);
  if (!m) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  const urlHandle = m[1].toLowerCase();
  const replyId = m[2];

  // The URL handle and the bound handle should match — otherwise the
  // carrier is trying to claim someone else's reply.
  if (urlHandle !== boundHandle) {
    return NextResponse.json({ error: "handle_mismatch", expected: boundHandle, got: urlHandle }, { status: 400 });
  }

  // Already submitted?
  const existing = await getReply(replyId);
  if (existing) {
    return NextResponse.json({ error: "already_submitted", credited: existing.basePaid }, { status: 409 });
  }

  // Daily cap
  const dayCount = await dailyReplyCount(addr);
  if (dayCount >= ECONOMY.REPLY_DAILY_CAP) {
    return NextResponse.json({ error: "daily_cap", cap: ECONOMY.REPLY_DAILY_CAP }, { status: 429 });
  }

  // Lookup the tweet via X API
  const lookup = await lookupTweet(replyId);
  if (!lookup.ok || !lookup.inReplyToId) {
    return NextResponse.json({
      error: lookup.inReplyToId ? `lookup_failed_${lookup.reason}` : "not_a_reply",
    }, { status: 400 });
  }
  // Author must match the bound handle (defense-in-depth — URL handle
  // could be spoofed by a custom domain or proxy)
  if (lookup.authorHandle && lookup.authorHandle !== boundHandle) {
    return NextResponse.json({ error: "author_mismatch", expected: boundHandle }, { status: 400 });
  }

  // The parent must be one we posted
  const isOurs = await isAutopostedTweet(lookup.inReplyToId);
  if (!isOurs) {
    return NextResponse.json({ error: "parent_not_recognized" }, { status: 400 });
  }

  // Burst window — first N replies inside window get 2×
  const parentAt = await parentPostedAt(lookup.inReplyToId);
  const replyTs = Date.now();
  const elapsedMin = parentAt ? (replyTs - parentAt) / 60_000 : Infinity;
  const priorCount = await replyCountForParent(lookup.inReplyToId);
  const burstWinner =
    elapsedMin <= ECONOMY.REPLY_BURST_WINDOW_MIN &&
    priorCount < ECONOMY.REPLY_BURST_FIRST_N;
  const beforeCollapse = burstWinner ? ECONOMY.REPLY_BOUNTY * 2 : ECONOMY.REPLY_BOUNTY;

  // Collapse-mode earn multiplier
  const { getCollapseState, applyEarnMultiplier } = await import("@/lib/collapse-mode");
  const collapse = await getCollapseState();
  const basePaid = applyEarnMultiplier(beforeCollapse, collapse);

  const rec: ReplyRecord = {
    replyId,
    parentId: lookup.inReplyToId,
    wallet: addr,
    xHandle: boundHandle,
    ts: replyTs,
    burstWinner,
    basePaid,
    bonusPaid: 0,
    bonusScanned: false,
  };
  await recordReply(rec);

  try {
    await creditWalletHex(addr, basePaid, {
      kind: "manual",
      note: burstWinner
        ? `Reply · BURST 2× · +${basePaid} ⬡`
        : `Reply to @4040hex · +${basePaid} ⬡`,
    }, { farmable: true });
  } catch {/* non-fatal — record is in, credit can be backfilled */}

  return NextResponse.json({
    ok: true,
    credited: basePaid,
    burstWinner,
    eligibleForBonus: true,
    bonusCheckIn: "24h",
    bonusAmount: ECONOMY.REPLY_ENGAGEMENT_BONUS,
    bonusThreshold: ECONOMY.REPLY_ENGAGEMENT_THRESHOLD,
    dailyRepliesUsed: dayCount + 1,
    dailyCap: ECONOMY.REPLY_DAILY_CAP,
  });
}
