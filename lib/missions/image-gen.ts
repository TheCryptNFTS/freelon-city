/**
 * Image generation for the "Deploy Citizen" mission — INTERNAL/TEST ONLY.
 *
 * Mirrors the proven script (image_real_test.py): gpt-image-1.5 `images.edit()`
 * with the REAL shipped citizen art as the reference, and an identity-lock-FIRST
 * prompt so the output keeps the faceted-monolith head + glowing hex face + robes
 * and only the SCENE changes. No SDK — direct multipart fetch to OpenAI.
 *
 * NO payments, NO FUEL, NO discounts. The generated PNG is written under
 * public/generated/deploy/ and served statically for the test.
 *
 * SECURITY: scene is chosen from a SERVER-SIDE allowlist (SCENES) by key — there
 * is NO arbitrary user prompt box and NO user-uploaded reference in v1.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Citizen } from "@/lib/citizens";
import type { Specialization } from "@/lib/specialization";

const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-1.5";

// Real shipped art lives one level up from the site root.
const SHIP_DIR = path.resolve(process.cwd(), "../ship/images_jpg");
const OUT_DIR = path.resolve(process.cwd(), "public/generated/deploy");
const PUBLIC_PREFIX = "/generated/deploy";

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
};

export function isValidScene(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCENES, key);
}

function id4(n: number): string {
  return n.toString().padStart(4, "0");
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

  const refPath = path.join(SHIP_DIR, `${id4(args.citizen.id)}.jpg`);
  let refBytes: Buffer;
  try {
    refBytes = await readFile(refPath);
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

    await mkdir(OUT_DIR, { recursive: true });
    const filename = `${id4(args.citizen.id)}-${args.sceneKey}-${Date.now()}.png`;
    await writeFile(path.join(OUT_DIR, filename), Buffer.from(b64, "base64"));

    return {
      ok: true,
      url: `${PUBLIC_PREFIX}/${filename}`,
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
