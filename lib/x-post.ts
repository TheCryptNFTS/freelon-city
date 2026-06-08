/**
 * Shared X (Twitter) posting helper — OAuth 1.0a signed POST to the v2 API.
 *
 * Extracted from the daily-signal cron so multiple cron jobs (daily-signal,
 * agent-transmission) post through ONE audited code path instead of copy-pasted
 * OAuth signing. Posting account is @freeloncity.
 *
 * Required env (Vercel project settings):
 *   X_API_KEY, X_API_SECRET                — OAuth 1.0a consumer key/secret
 *   X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET  — @freeloncity user access token/secret
 */
import crypto from "node:crypto";

/** True only when all four X credentials are present. Callers dry-run otherwise. */
export function hasXCredentials(): boolean {
  return (
    !!process.env.X_API_KEY &&
    !!process.env.X_API_SECRET &&
    !!process.env.X_ACCESS_TOKEN &&
    !!process.env.X_ACCESS_TOKEN_SECRET
  );
}

/** OAuth 1.0a signed POST to X v2 /2/tweets. Throws on non-2xx (caller logs). */
export async function postTweet(text: string): Promise<unknown> {
  const url = "https://api.x.com/2/tweets";
  const oauth = buildOauthHeader("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: oauth },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API ${res.status}: ${body}`);
  }
  return res.json();
}

function buildOauthHeader(method: string, url: string): string {
  const oauth = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };
  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${pct(k)}=${pct((oauth as Record<string, string>)[k])}`)
    .join("&");
  const base = [method.toUpperCase(), pct(url), pct(paramString)].join("&");
  const signingKey = `${pct(process.env.X_API_SECRET!)}&${pct(process.env.X_ACCESS_TOKEN_SECRET!)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");
  return (
    "OAuth " +
    Object.entries({ ...oauth, oauth_signature: signature })
      .map(([k, v]) => `${pct(k)}="${pct(String(v))}"`)
      .join(", ")
  );
}

function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
