/**
 * Vercel cron endpoint — THE SIGNAL REPORT ritual. Fires Sundays 18:00 UTC
 * (vercel.json), while the civ week (Mon 00:00 reset) is still warm.
 *
 * DELIBERATE TRADEOFF (2026-06-10): 18:00 Sunday snapshots the standings six
 * hours before the week closes — a civ CAN be overtaken after the post. That's
 * the engagement-window choice (US daytime + a "flip the board before the
 * city posts" incentive). The settled-week alternative is Monday 00:05 with
 * weekKeyOf(now - 1 day); switch if the contradiction ever bites.
 *
 * Posts the week's record to X as @4040hex through the same audited
 * OAuth path as daily-signal / agent-transmission (lib/x-post). Deterministic
 * data only: winner civ + notable-citizen count from the same hardened reads
 * /report renders. The link carries ?ref=sr-<week> (referral attribution) and
 * unfurls the weekly /api/og/report card.
 *
 * Safety model (hardened 2026-06-10 after red-team):
 *   - Bearer CRON_SECRET, fail-closed (copied from daily-signal).
 *   - ?dry=1 → returns would_post without posting or consuming the week.
 *   - CLAIM-THEN-EXTEND dedupe: SET NX EX 900 claims the week for 15 min;
 *     only a CONFIRMED post extends the key to 30 days (value = tweet id).
 *     A crash mid-post self-heals in 15 min instead of stranding the week,
 *     and an ambiguous X failure (timeout-after-write) can't double-post
 *     inside the claim window. Manual reconcile: check the @4040hex timeline,
 *     then DEL freelon:report:posted:<week> and re-curl with the Bearer.
 *   - postTweet carries an 8s abort (lib/x-post) + maxDuration below.
 *   - No X creds → dry-run payload (house failure model).
 *
 * Required env: CRON_SECRET, X_API_KEY/_SECRET, X_ACCESS_TOKEN/_SECRET.
 */
import { NextResponse } from "next/server";
import { getCivWeekStandings } from "@/lib/city-week";
import { topCitizens } from "@/lib/progression-store";
import { getCitizen } from "@/lib/citizens";
import { tweetSignalReport } from "@/lib/share";
import { postTweet, hasXCredentials } from "@/lib/x-post";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const POSTED_KEY = (week: string) => `freelon:report:posted:${week}`;

export async function GET(req: Request) {
  // Fail closed in ALL environments — unset secret refuses, wrong secret 401s.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_unconfigured" }, { status: 503 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const civ = await getCivWeekStandings();
  const winner = civ.totalActive > 0 ? civ.standings[0] : null;
  let notableCount = 0;
  try {
    const rows = await topCitizens("level", 12);
    for (const r of rows) {
      if (getCitizen(r.tokenId)) notableCount++;
      if (notableCount >= 8) break;
    }
  } catch { /* count stays 0 — template renders the open-record line */ }

  const text = tweetSignalReport({
    week: civ.week,
    winnerName: winner?.name ?? null,
    notableCount,
  });

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (dry || !hasXCredentials()) {
    return NextResponse.json({
      mode: "dry-run",
      reason: dry ? "dry=1" : "X credentials not set in env",
      week: civ.week,
      would_post: text,
    });
  }

  // Claim-then-extend (see header): a 15-min NX claim guards the post window;
  // only a confirmed post extends it to 30 days. Best-effort: if Upstash is
  // unreachable we still post — the weekly cron fires once; dedupe is
  // belt-and-braces for manual pokes.
  if (hasUpstash) {
    try {
      const set = await upstash(["SET", POSTED_KEY(civ.week), "claimed", "NX", "EX", "900"]);
      if (set !== "OK") {
        return NextResponse.json({ mode: "skipped", reason: "already_posted_or_claimed", week: civ.week });
      }
    } catch { /* proceed */ }
  }

  try {
    const result = (await postTweet(text)) as { data?: { id?: string } };
    const tweetId = result?.data?.id ?? "posted";
    // Confirmed on X — lock the week for 30 days, value = tweet id (audit trail).
    if (hasUpstash) {
      await upstash(["SET", POSTED_KEY(civ.week), tweetId, "XX", "EX", "2592000"]).catch(() => {});
    }
    return NextResponse.json({ mode: "posted", week: civ.week, tweetId, tweet: text, response: result });
  } catch (e) {
    // Do NOT release the claim — an ambiguous failure (timeout after X accepted
    // the write) inside the 15-min window must not allow a double-post. The
    // claim expires on its own; retry after that, or reconcile manually per
    // the header comment.
    return NextResponse.json({ mode: "error", week: civ.week, error: String(e) }, { status: 500 });
  }
}
