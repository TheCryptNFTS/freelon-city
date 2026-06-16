/**
 * Vercel cron — weekly (configure in vercel.json). The "Crack the Citizen"
 * distribution engine: auto-posts the GUARD THE POT spectacle as @4040hex so the
 * mechanic actually produces a public, screenshot-able weekly beat.
 *
 * Two modes:
 *   - CRACK: the vault was cracked since the last post → celebrate the (masked)
 *     winner, then open a FRESH vault (startNextRound) so the game never ends.
 *   - STANDING: the vault still stands and ≥1 wallet has tried → "it hasn't budged,
 *     your move." (Skips a brand-new 0-attempt vault so we never post a dead "0 tried".)
 *
 * Copy-safe: the ⬡ fee is a burn (sink-only), the prize label is display-only, no
 * value/return claims. Gated by GUARD_POT_LIVE (don't advertise a pot that isn't
 * live) + CRON_SECRET (constant-time). ?dry=1 previews without posting.
 */
import { NextResponse } from "next/server";
import { cronAuthed } from "@/lib/cron-auth";
import { getRound, startNextRound } from "@/lib/guard-store";
import { tweetGuardPot } from "@/lib/share";
import { postTweet, hasXCredentials } from "@/lib/x-post";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function maskAddr(addr: string | null): string {
  if (!addr || addr.length < 10) return "Someone";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_unconfigured" }, { status: 503 });
  }
  if (!cronAuthed(auth)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.GUARD_POT_LIVE) {
    return NextResponse.json({ mode: "disabled", reason: "GUARD_POT_LIVE not set" });
  }

  const round = await getRound();
  const cracked = round.status === "won";

  // A standing vault with zero attempts has no story — don't post a dead "0 tried".
  if (!cracked && round.attempts === 0) {
    return NextResponse.json({ mode: "skipped", reason: "vault_open_no_attempts", round: round.round });
  }

  const text = tweetGuardPot({
    round: round.round,
    prizeLabel: round.prizeLabel,
    attempts: round.attempts,
    cracked,
    winnerMask: cracked ? maskAddr(round.winner) : undefined,
  });

  // Dedupe: a crack is celebrated once per round (then we advance); a standing
  // nudge re-fires ~weekly. Key carries the mode so a crack + the next standing
  // can't collide.
  const dedupeKey = cracked
    ? `freelon:guard:posted:crack:${round.round}`
    : `freelon:guard:posted:standing:${round.round}`;
  const dedupeTtl = cracked ? 2_592_000 : 518_400; // 30d crack lock / ~6d standing

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (dry || !hasXCredentials()) {
    return NextResponse.json({
      mode: "dry-run",
      reason: dry ? "dry=1" : "X credentials not set in env",
      kind: cracked ? "crack" : "standing",
      round: round.round,
      would_post: text,
      would_advance: cracked,
    });
  }

  // Claim-then-extend window (mirrors signal-report): a 15-min NX claim guards the
  // post; only a confirmed post extends the lock. Belt-and-braces vs manual pokes.
  if (hasUpstash) {
    try {
      const set = await upstash(["SET", dedupeKey, "claimed", "NX", "EX", "900"]);
      if (set !== "OK") {
        return NextResponse.json({ mode: "skipped", reason: "already_posted_or_claimed", round: round.round });
      }
    } catch { /* proceed — weekly cron fires once */ }
  }

  try {
    const result = (await postTweet(text)) as { data?: { id?: string } };
    const tweetId = result?.data?.id ?? "posted";
    if (hasUpstash) {
      await upstash(["SET", dedupeKey, tweetId, "XX", "EX", String(dedupeTtl)]).catch(() => {});
    }
    // After a confirmed CRACK post, open the next vault so the game continues.
    let advancedTo: number | null = null;
    if (cracked) {
      const next = await startNextRound();
      advancedTo = next.round;
    }
    return NextResponse.json({
      mode: "posted",
      kind: cracked ? "crack" : "standing",
      round: round.round,
      advancedTo,
      tweetId,
      tweet: text,
    });
  } catch (e) {
    // Don't release the claim — an ambiguous failure inside the window must not
    // double-post. The claim self-expires; retry after that.
    return NextResponse.json({ mode: "error", round: round.round, error: String(e) }, { status: 500 });
  }
}
