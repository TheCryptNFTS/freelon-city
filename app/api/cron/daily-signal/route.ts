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
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getDailySignal } from "@/lib/daily-signal";
import { CIVILIZATIONS } from "@/lib/constants";

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

  const haveKeys =
    !!process.env.X_API_KEY &&
    !!process.env.X_API_SECRET &&
    !!process.env.X_ACCESS_TOKEN &&
    !!process.env.X_ACCESS_TOKEN_SECRET;

  if (!haveKeys) {
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

// OAuth 1.0a signed POST to X v2 /2/tweets
async function postTweet(text: string) {
  const url = "https://api.x.com/2/tweets";
  const oauth = buildOauthHeader("POST", url, {});
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: oauth,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API ${res.status}: ${body}`);
  }
  return await res.json();
}

function buildOauthHeader(method: string, url: string, bodyParams: Record<string, string>) {
  const oauth = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };
  const all: Record<string, string> = { ...oauth, ...bodyParams };
  const paramString = Object.keys(all)
    .sort()
    .map((k) => `${pct(k)}=${pct(all[k])}`)
    .join("&");
  const base = [method.toUpperCase(), pct(url), pct(paramString)].join("&");
  const signingKey = `${pct(process.env.X_API_SECRET!)}&${pct(process.env.X_ACCESS_TOKEN_SECRET!)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");
  const header =
    "OAuth " +
    Object.entries({ ...oauth, oauth_signature: signature })
      .map(([k, v]) => `${pct(k)}="${pct(String(v))}"`)
      .join(", ");
  return header;
}

function pct(s: string) {
  return encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
