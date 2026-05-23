/**
 * X DM sender — sends a Direct Message via X API v2.
 *
 * Auth: OAuth 1.0a using the FREELON CITY bot account credentials
 *       (X_API_KEY/SECRET + X_ACCESS_TOKEN/SECRET — same env vars
 *       already used by /api/cron/daily-signal).
 *
 * Endpoint: POST https://api.x.com/2/dm_conversations/with/{user_id}/messages
 *
 * IMPORTANT — free-tier limits:
 *   - X free tier allows ~500 DMs/month total
 *   - DM recipient must follow the sending account (X anti-spam)
 *   - We always also write to the on-site inbox so users without DM
 *     setup still see notifications next visit.
 *
 * If any required env var is missing, sendDM() returns false silently.
 * Callers should treat DM as best-effort, not a hard guarantee.
 */

import crypto from "node:crypto";

function pct(s: string): string {
  return encodeURIComponent(s)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

/** OAuth 1.0a header for a request. Mirrors the implementation used in
 *  /api/cron/daily-signal so a single env-var set powers both.
 *  Exported for reuse by lib/x-autopost.ts (media upload + tweet post). */
export function oauth1Header(opts: {
  method: string;
  url: string;
  body?: Record<string, unknown>; // unused for JSON body — signature is over query + form params only
}): string | null {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const token = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !token || !tokenSecret) return null;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };

  // Signature base — note: for JSON-body endpoints, only oauth_* params
  // and URL query params are included in the signature, NOT the body.
  const urlObj = new URL(opts.url);
  const baseParams: Record<string, string> = { ...oauthParams };
  urlObj.searchParams.forEach((v, k) => { baseParams[k] = v; });

  const paramString = Object.keys(baseParams)
    .sort()
    .map((k) => `${pct(k)}=${pct(baseParams[k])}`)
    .join("&");

  const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
  const baseString = `${opts.method.toUpperCase()}&${pct(baseUrl)}&${pct(paramString)}`;
  const signingKey = `${pct(consumerSecret)}&${pct(tokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${pct(k)}="${pct(headerParams[k])}"`)
      .join(", ")
  );
}

export type DmResult = { ok: true; id: string } | { ok: false; reason: string };

/**
 * Send a DM to a specific X user ID.
 * - text: max 10,000 chars (X limit). We always pass <300.
 * - userId: X numeric user ID (NOT the @handle). We have this from
 *   the OAuth callback record (x-store.ts stores xId).
 *
 * Returns ok:false silently if env not configured — caller treats
 * as best-effort.
 */
export async function sendDM(userId: string, text: string): Promise<DmResult> {
  if (!userId || !text) return { ok: false, reason: "missing_args" };
  if (text.length > 300) text = text.slice(0, 297) + "…";

  const url = `https://api.x.com/2/dm_conversations/with/${encodeURIComponent(userId)}/messages`;
  const auth = oauth1Header({ method: "POST", url });
  if (!auth) return { ok: false, reason: "x_creds_missing" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      // 403 typically means "recipient does not allow DMs from non-followers"
      // 429 means we've hit the free-tier monthly cap
      return { ok: false, reason: `http_${res.status}` };
    }
    const j = (await res.json()) as { data?: { dm_event_id?: string } };
    return { ok: true, id: j.data?.dm_event_id || "" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message.slice(0, 40) : "unknown" };
  }
}

/** True only if all 4 OAuth 1.0a env vars are configured. */
export function dmCapable(): boolean {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  );
}
