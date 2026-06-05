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
    const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait=1" },
      body: JSON.stringify({
        input: {
          image: imageUrl(args.citizen.id),
          first_frame_image: imageUrl(args.citizen.id), // some models name it this
          prompt: `FREELON CITY citizen #${id4(args.citizen.id)}: ${style.desc}. Keep the character identical; animate subtly. Looping, premium, dark cinematic.`,
        },
      }),
    });
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
      const pr = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
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

/** Replicate output is usually a URL string or an array of URLs — grab the first. */
function pickVideoUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output) && typeof output[0] === "string" && output[0].startsWith("http")) return output[0];
  return null;
}

/** Fetch the provider's mp4 and re-host it on Vercel Blob (public). */
async function store(providerUrl: string, tokenId: number, styleKey: string): Promise<VideoGenResult> {
  try {
    const vr = await fetch(providerUrl);
    if (!vr.ok) return { ok: false, error: `fetch_video_${vr.status}` };
    const bytes = Buffer.from(await vr.arrayBuffer());
    const filename = `video/${id4(tokenId)}-${styleKey}-${Date.now()}.mp4`;
    const blob = await put(filename, bytes, { access: "public", contentType: "video/mp4" });
    return { ok: true, url: blob.url, filename };
  } catch (e) {
    return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
  }
}
