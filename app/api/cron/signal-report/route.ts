/**
 * Vercel cron endpoint — THE SIGNAL REPORT ritual. Fires Sundays 18:00 UTC
 * (vercel.json), while the civ week (Mon 00:00 reset) is still warm.
 *
 * Posts the week's record to X as @freeloncity through the same audited
 * OAuth path as daily-signal / agent-transmission (lib/x-post). Deterministic
 * data only: winner civ + notable-citizen count from the same hardened reads
 * /report renders. The link carries ?ref=sr-<week> (referral attribution) and
 * unfurls the weekly /api/og/report card.
 *
 * Safety model:
 *   - Bearer CRON_SECRET, fail-closed (copied from daily-signal).
 *   - ?dry=1 → returns would_post without posting or consuming the week.
 *   - Once per ISO week via Upstash SET NX (freelon:report:posted:<week>);
 *     key is released if the X call fails so a retry can land the post.
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

  // Once per ISO week. Best-effort: if Upstash is unreachable we still post —
  // the weekly cron fires once, dedupe is belt-and-braces for manual pokes.
  if (hasUpstash) {
    try {
      const set = await upstash(["SET", POSTED_KEY(civ.week), "1", "NX", "EX", "2592000"]);
      if (set !== "OK") {
        return NextResponse.json({ mode: "skipped", reason: "already_posted", week: civ.week });
      }
    } catch { /* proceed */ }
  }

  try {
    const result = await postTweet(text);
    return NextResponse.json({ mode: "posted", week: civ.week, tweet: text, response: result });
  } catch (e) {
    // Release the week so a retry (manual or next invocation) can land it.
    if (hasUpstash) await upstash(["DEL", POSTED_KEY(civ.week)]).catch(() => {});
    return NextResponse.json({ mode: "error", week: civ.week, error: String(e) }, { status: 500 });
  }
}
