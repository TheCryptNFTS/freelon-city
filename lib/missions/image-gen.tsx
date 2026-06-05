/**
 * Image generation for the "Deploy Citizen" mission.
 *
 * gpt-image-1.5 `images.edit()` with the citizen's REAL art as the reference and
 * an identity-lock-FIRST prompt so the output keeps the faceted-monolith head +
 * glowing hex face + robes and only the SCENE changes. No SDK — direct multipart
 * fetch to OpenAI.
 *
 * SERVERLESS-SAFE (2026-06-05): the reference art is FETCHED from the citizen's
 * hosted image URL (the local ../ship folder doesn't exist on Vercel), and the
 * output PNG is uploaded to Vercel BLOB (the filesystem is read-only in prod).
 * Returns the public Blob URL. Falls back to local disk only in dev (no token).
 *
 * SECURITY: scene is chosen from a SERVER-SIDE allowlist (SCENES) by key — there
 * is NO arbitrary user prompt box and NO user-uploaded reference.
 */

import { put } from "@vercel/blob";
import type { Citizen } from "@/lib/citizens";
import type { Specialization } from "@/lib/specialization";
import { imageUrl } from "@/lib/constants";

const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-1.5";

/** Server-side scene allowlist. The client may only pass one of these keys. */
export const SCENES: Record<string, { label: string; desc: string }> = {
  "neon-city": {
    label: "Neon City",
    desc: "standing atop a rain-slick neon spire overlooking the Mars city at night, volumetric city light below",
  },
  "signal-fire": {
    label: "Signal Fire",
    desc: "before a towering wall of signal-fire in a war hall, embers and sparks drifting through the dark",
  },
  "throne-room": {
    label: "Throne Room",
    desc: "seated on a throne dais under dramatic shafts of light, regal and still, the hall fading into shadow",
  },
  "ash-wastes": {
    label: "Ash Wastes",
    desc: "alone on a cracked Mars salt-flat under a vast dust-storm sky, lone and monumental, distant ruins on the horizon",
  },
  "data-temple": {
    label: "Data Temple",
    desc: "inside a cathedral of glowing data-glass and floating glyphs, sacred and quiet, light raking through the columns",
  },
  "victory-parade": {
    label: "Victory",
    desc: "raised above a roaring crowd of citizens under banners and drifting embers, triumphant, hero-lit from below",
  },
};

export function isValidScene(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCENES, key);
}

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

/**
 * Stamp a tasteful FREELON signature onto the generated PNG so every shared copy
 * carries the brand (free marketing). Uses next/og (already a dep) to composite
 * the image full-bleed + a corner mark. Fail-soft: returns the original bytes if
 * compositing throws, so a stamp hiccup never costs the holder their render.
 */
async function stampSignature(pngBytes: Buffer, tokenId: number): Promise<Buffer> {
  try {
    const { ImageResponse } = await import("next/og");
    const dataUri = `data:image/png;base64,${pngBytes.toString("base64")}`;
    const res = new ImageResponse(
      (
        <div style={{ display: "flex", width: "1024px", height: "1024px", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUri} width={1024} height={1024} alt="" style={{ width: "1024px", height: "1024px" }} />
          <div
            style={{
              position: "absolute", bottom: "22px", right: "26px", display: "flex",
              alignItems: "center", padding: "8px 16px", borderRadius: "999px",
              background: "rgba(8,8,10,0.62)", border: "1px solid rgba(200,170,100,0.5)",
              color: "#E9C984", fontSize: "22px", letterSpacing: "0.06em", fontWeight: 600,
            }}
          >
            {`⬡ MADE BY FREELON #${id4(tokenId)} · FREELONCITY.COM`}
          </div>
        </div>
      ),
      { width: 1024, height: 1024 },
    );
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return pngBytes; // unstamped beats failed
  }
}

/** The proven identity-lock-FIRST prompt. Identity is non-negotiable; the scene
 *  is the only thing that changes. Class/level/skill flavor the framing. */
function buildImagePrompt(citizen: Citizen, spec: Specialization, sceneDesc: string): string {
  const classLine =
    spec.cls === "drifter"
      ? "an untrained citizen"
      : `a ${spec.className} (${spec.rank.label}, Level-shaped presence)`;
  return [
    "Keep the figure in the reference image EXACTLY: its faceted sculptural head/helm, the glowing",
    "geometric HEX symbol where a face would be, its robes, its exact colour palette and materials.",
    "Do NOT add a human face, eyes, hair, or turn it into a person or cartoon. Same character, same silhouette.",
    `This is FREELON CITY citizen #${id4(citizen.id)} (${citizen.civilization}, ${citizen.tier}), ${classLine}.`,
    `Only change the SETTING to a cinematic scene: ${sceneDesc}.`,
    "Premium dark cinematic render, dramatic volumetric light, the hex glowing as a key light source.",
    "Collector-grade, readable at thumbnail size.",
  ].join(" ");
}

export type ImageGenResult =
  | { ok: true; url: string; filename: string; promptTokens?: number; imageTokens?: number }
  | { ok: false; error: string };

/**
 * Generate one scene image for a citizen off its real shipped art.
 * Writes to public/generated/deploy/{id4}-{scene}-{ts}.png and returns the URL.
 */
export async function generateCitizenScene(args: {
  citizen: Citizen;
  spec: Specialization;
  sceneKey: string;
  timeoutMs?: number;
}): Promise<ImageGenResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_api_key" };
  if (!isValidScene(args.sceneKey)) return { ok: false, error: "invalid_scene" };

  // Reference art: fetch the citizen's hosted image (works on serverless; the
  // old ../ship local folder isn't deployed). Timeout-guarded.
  let refBytes: Buffer;
  try {
    const refController = new AbortController();
    const rt = setTimeout(() => refController.abort(), 15_000);
    const refRes = await fetch(imageUrl(args.citizen.id), { signal: refController.signal }).finally(() => clearTimeout(rt));
    if (!refRes.ok) return { ok: false, error: "reference_art_missing" };
    refBytes = Buffer.from(await refRes.arrayBuffer());
  } catch {
    return { ok: false, error: "reference_art_missing" };
  }

  const scene = SCENES[args.sceneKey];
  const prompt = buildImagePrompt(args.citizen, args.spec, scene.desc);

  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append(
    "image",
    new Blob([new Uint8Array(refBytes)], { type: "image/jpeg" }),
    `${id4(args.citizen.id)}.jpg`,
  );

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000);
  try {
    const res = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `openai_${res.status}` };
    const j = (await res.json()) as {
      data?: { b64_json?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const b64 = j.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "empty_image" };

    // Upload to Vercel Blob (public) → a real, shareable, persistent URL. The
    // filesystem is read-only on Vercel, so we can't write to /public anymore.
    // The image is BRANDED with a FREELON signature first (free marketing on share).
    // Auth: the SDK uses BLOB_READ_WRITE_TOKEN if present, else the project's OIDC
    // connection. We DON'T pre-guard on the env token (OIDC-connected stores don't
    // set it) — instead we let put() try and surface its real error if it fails.
    const filename = `deploy/${id4(args.citizen.id)}-${args.sceneKey}-${Date.now()}.png`;
    const bytes = await stampSignature(Buffer.from(b64, "base64"), args.citizen.id);
    let blob;
    try {
      blob = await put(filename, bytes, { access: "public", contentType: "image/png" });
    } catch (e) {
      return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
    }

    return {
      ok: true,
      url: blob.url,
      filename,
      promptTokens: j.usage?.input_tokens,
      imageTokens: j.usage?.output_tokens,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "AbortError" ? "timeout" : "fetch_failed" };
  } finally {
    clearTimeout(t);
  }
}
