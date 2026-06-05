/**
 * Short citizen VIDEO generation — animate a FREELON's art into a brief looping
 * clip. Mirrors the image pipeline, but video providers are ASYNC: submit a job →
 * poll until done → fetch the mp4 → re-upload to Vercel Blob (so we control the
 * URL + it persists). Provider = Replicate (single REST API, swappable model).
 *
 * SHIPS KEYLESS-SAFE: with no REPLICATE_API_TOKEN it returns { ok:false,
 * error:"no_video_provider" } so the feature degrades to "coming soon" instead of
 * crashing. The exact model + its input schema is env-configurable
 * (REPLICATE_VIDEO_MODEL) so it can be tuned once the key is set, without a deploy.
 *
 * SECURITY: motion style is a SERVER-ALLOWLISTED key — no free-form prompt.
 */

import { put } from "@vercel/blob";
import type { Citizen } from "@/lib/citizens";
import { imageUrl } from "@/lib/constants";

// Default image-to-video model on Replicate (owner/name). Override with
// REPLICATE_VIDEO_MODEL once you've picked/tested one (e.g. a Kling/Wan i2v model).
const DEFAULT_MODEL = "minimax/video-01";

/** Server-side motion-style allowlist (no free prompt). */
export const VIDEO_STYLES: Record<string, { label: string; desc: string }> = {
  "signal-pulse": { label: "Signal Pulse", desc: "the glowing hex face pulses with energy, faint particles drift, subtle breathing motion, cinematic and alive" },
  "slow-rise":    { label: "Slow Rise", desc: "a slow heroic camera rise on the still figure, volumetric light shifting, embers drifting upward" },
  "ember-drift":  { label: "Ember Drift", desc: "embers and dust drift across the frame, the robe sways gently, ambient firelight flickering" },
  "glitch-warp":  { label: "Signal Warp", desc: "a brief signal glitch ripples across the figure, holographic distortion, the hex flaring, then settling" },
};

export function isValidVideoStyle(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(VIDEO_STYLES, key);
}

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

export type VideoGenResult =
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string };

/** fetch with a hard per-request timeout (Vercel kills the function if a single
 *  fetch hangs forever; the poll deadline alone can't interrupt an in-flight call). */
async function fetchT(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB cap on the re-host download

/**
 * Generate a short clip for a citizen. Returns a public Blob mp4 URL.
 * Polls the Replicate prediction up to ~timeoutMs (default 8 min).
 */
export async function generateCitizenVideo(args: {
  citizen: Citizen;
  styleKey: string;
  timeoutMs?: number;
}): Promise<VideoGenResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return { ok: false, error: "no_video_provider" };
  if (!isValidVideoStyle(args.styleKey)) return { ok: false, error: "invalid_style" };

  const model = process.env.REPLICATE_VIDEO_MODEL || DEFAULT_MODEL;
  const style = VIDEO_STYLES[args.styleKey];
  const deadline = Date.now() + (args.timeoutMs ?? 8 * 60_000);

  // 1. Submit the prediction (image-to-video). Most i2v models accept image+prompt;
  //    we pass the citizen's hosted art as the init image (Replicate fetches URLs).
  let getUrl: string;
  try {
    const res = await fetchT(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait=1" },
      body: JSON.stringify({
        input: {
          image: imageUrl(args.citizen.id),
          first_frame_image: imageUrl(args.citizen.id), // some models name it this
          prompt: `FREELON CITY citizen #${id4(args.citizen.id)}: ${style.desc}. Keep the character identical; animate subtly. Looping, premium, dark cinematic.`,
        },
      }),
    }, 65_000); // Prefer:wait can hold up to ~60s
    if (!res.ok) return { ok: false, error: `replicate_${res.status}` };
    const j = (await res.json()) as { status?: string; output?: unknown; urls?: { get?: string } };
    // With Prefer:wait the prediction may already be done; else poll urls.get.
    const done = pickVideoUrl(j.output);
    if (j.status === "succeeded" && done) return await store(done, args.citizen.id, args.styleKey);
    if (j.status === "failed" || j.status === "canceled") return { ok: false, error: "provider_failed" };
    if (!j.urls?.get) return { ok: false, error: "no_poll_url" };
    getUrl = j.urls.get;
  } catch (e) {
    return { ok: false, error: `submit_failed:${(e as Error).message}`.slice(0, 120) };
  }

  // 2. Poll until terminal or deadline.
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const pr = await fetchT(getUrl, { headers: { Authorization: `Bearer ${token}` } }, 15_000);
      if (!pr.ok) continue;
      const pj = (await pr.json()) as { status?: string; output?: unknown };
      if (pj.status === "succeeded") {
        const url = pickVideoUrl(pj.output);
        if (!url) return { ok: false, error: "empty_output" };
        return await store(url, args.citizen.id, args.styleKey);
      }
      if (pj.status === "failed" || pj.status === "canceled") return { ok: false, error: "provider_failed" };
    } catch { /* transient — keep polling */ }
  }
  return { ok: false, error: "timeout" };
}

/** Replicate output shape varies by model — URL string, array of URLs, or a
 *  nested object ({video|url}) / object-array. Probe the common shapes. */
function pickVideoUrl(output: unknown): string | null {
  const isUrl = (s: unknown): s is string => typeof s === "string" && s.startsWith("http");
  if (isUrl(output)) return output;
  if (Array.isArray(output)) {
    if (isUrl(output[0])) return output[0];
    const o0 = output[0] as Record<string, unknown> | undefined;
    if (o0 && (isUrl(o0.url) || isUrl(o0.video))) return (o0.url ?? o0.video) as string;
  }
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (isUrl(o.video)) return o.video as string;
    if (isUrl(o.url)) return o.url as string;
  }
  return null;
}

/** Fetch the provider's mp4 and re-host it on Vercel Blob (public). Timeout +
 *  size-capped so a slow/huge download can't hang the function past the platform
 *  limit (which would kill it BEFORE the route can refund the 4000⬡). */
async function store(providerUrl: string, tokenId: number, styleKey: string): Promise<VideoGenResult> {
  try {
    const vr = await fetchT(providerUrl, {}, 60_000);
    if (!vr.ok) return { ok: false, error: `fetch_video_${vr.status}` };
    const len = Number(vr.headers.get("content-length") || 0);
    if (len > MAX_VIDEO_BYTES) return { ok: false, error: "video_too_large" };
    const buf = Buffer.from(await vr.arrayBuffer());
    if (buf.byteLength > MAX_VIDEO_BYTES) return { ok: false, error: "video_too_large" };
    const filename = `video/${id4(tokenId)}-${styleKey}-${Date.now()}.mp4`;
    const blob = await put(filename, buf, { access: "public", contentType: "video/mp4" });
    return { ok: true, url: blob.url, filename };
  } catch (e) {
    return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
  }
}
