/**
 * Vercel cron endpoint — fires daily at 04:04 UTC.
 *
 * Posts the deterministic Daily Signal for today to X (Twitter).
 *
 * Required env (set in Vercel project settings):
 *   CRON_SECRET                 — random string. Cron requests must carry it as Bearer.
 *   X_API_KEY                   — X API v2 OAuth 1.0a consumer key
 *   X_API_SECRET                — consumer secret
 *   X_ACCESS_TOKEN              — user access token (for the @freeloncity account)
 *   X_ACCESS_TOKEN_SECRET       — user access token secret
 *
 * If credentials are missing the endpoint returns a dry-run payload — useful
 * for testing before the X account is fully configured.
 */
import { NextResponse } from "next/server";
import { getDailySignal } from "@/lib/daily-signal";
import { CIVILIZATIONS } from "@/lib/constants";
import { postTweet, hasXCredentials } from "@/lib/x-post";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>.
  // Fail closed in ALL environments: if the secret isn't set, refuse.
  // Without this, preview/staging deploys accept unauthenticated cron
  // invocations and an attacker can spam-post or double-credit hex.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_unconfigured" }, { status: 503 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sig = getDailySignal(now);
  const civ = (CIVILIZATIONS as Record<string, { name: string }>)[sig.from];
  const text = `⬡ DAILY SIGNAL — ${now.toISOString().slice(0, 10)}\n\n"${sig.line}"\n\n— ${civ?.name ?? sig.from}\nfreeloncity.com`;

  if (!hasXCredentials()) {
    return NextResponse.json({
      mode: "dry-run",
      reason: "X credentials not set in env",
      would_post: text,
      civ: sig.from,
      date: now.toISOString(),
    });
  }

  try {
    const result = await postTweet(text);
    return NextResponse.json({ mode: "posted", tweet: text, response: result });
  } catch (e) {
    // Log the real error server-side, return only a generic code to the caller.
    console.error("[cron/daily-signal] postTweet failed", e);
    return NextResponse.json({ mode: "error", reason: "post_failed" }, { status: 500 });
  }
}
