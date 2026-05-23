/**
 * X autopost — uploads an image and posts a tweet using OAuth 1.0a.
 *
 * Reuses the credential set from lib/x-dm.ts (X_API_KEY/_SECRET +
 * X_ACCESS_TOKEN/_SECRET) so a single env-var pack powers DMs +
 * autopost both.
 *
 * Endpoints:
 *   POST https://upload.twitter.com/1.1/media/upload.json  (v1.1, multipart)
 *   POST https://api.x.com/2/tweets                         (v2, JSON)
 *
 * Failure model: every call returns ok:false silently. Caller treats
 * autopost as best-effort — the sweep cron continues even if X is
 * unreachable.
 */

import { oauth1Header } from "@/lib/x-dm";

export function postingCapable(): boolean {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  );
}

/**
 * Download an image and upload it to X v1.1 media/upload. Returns the
 * media_id_string on success, null on any failure (network, X error,
 * unsupported MIME).
 *
 * X size cap: 5 MB for JPEG/PNG/GIF/WebP. We fetch with a 5s timeout
 * so a slow Pinata gateway can't hang the cron.
 */
export async function uploadMedia(imageUrl: string): Promise<string | null> {
  if (!postingCapable()) return null;
  let buf: ArrayBuffer;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);
    const r = await fetch(imageUrl, { signal: ac.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!r.ok) return null;
    buf = await r.arrayBuffer();
  } catch {
    return null;
  }
  if (buf.byteLength === 0 || buf.byteLength > 5 * 1024 * 1024) return null;

  // X v1.1 media upload — simple form with one "media" file part.
  // OAuth signature for multipart uploads covers ONLY oauth_* params,
  // matching the existing helper's behaviour (no body params signed).
  const url = "https://upload.twitter.com/1.1/media/upload.json";
  const auth = oauth1Header({ method: "POST", url });
  if (!auth) return null;

  const form = new FormData();
  // Sniff MIME from the first few bytes so X doesn't reject as octet-stream.
  const bytes = new Uint8Array(buf);
  const mime =
    bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg"
    : bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png"
    : bytes[0] === 0x47 && bytes[1] === 0x49 ? "image/gif"
    : bytes[0] === 0x52 && bytes[1] === 0x49 ? "image/webp"
    : "image/jpeg";
  form.append("media", new Blob([buf], { type: mime }), `freelon.${mime.split("/")[1]}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth },
      body: form,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { media_id_string?: string };
    return j.media_id_string || null;
  } catch {
    return null;
  }
}

export type PostResult = { ok: true; id: string } | { ok: false; reason: string };

/**
 * Post a tweet via X v2. Optionally attaches one media_id from uploadMedia().
 * Returns the new tweet id on success.
 *
 * Text limit: 280 chars. We truncate with an ellipsis if longer.
 */
export async function postTweet(
  text: string,
  mediaIds?: string[],
): Promise<PostResult> {
  if (!postingCapable()) return { ok: false, reason: "creds_missing" };
  if (!text) return { ok: false, reason: "empty_text" };
  if (text.length > 280) text = text.slice(0, 277) + "…";

  const url = "https://api.x.com/2/tweets";
  const auth = oauth1Header({ method: "POST", url });
  if (!auth) return { ok: false, reason: "auth_failed" };

  const body: Record<string, unknown> = { text };
  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds.slice(0, 4) };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, reason: `http_${res.status}_${txt.slice(0, 80)}` };
    }
    const j = (await res.json()) as { data?: { id?: string } };
    return j.data?.id ? { ok: true, id: j.data.id } : { ok: false, reason: "no_id_in_response" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message.slice(0, 40) : "unknown" };
  }
}
