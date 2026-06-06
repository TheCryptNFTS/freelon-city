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
// NOTE: the JSX stamp (image-stamp.tsx) is loaded via DYNAMIC import at generation
// time, NOT a static import — so test/tooling that pulls this module for SCENES or
// the resolver's scene-validation never has to parse the JSX.

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

/**
 * Server-side STYLE allowlist — character TRANSFORMS (the community-loved
 * "Transformers" effect, productized). Unlike SCENES (which change the setting and
 * keep the figure locked), a style REIMAGINES the figure itself while preserving
 * its silhouette/pose/identity cues + the original background. The client may only
 * pass one of these keys (no free-form prompt → brand-safe, no moderation risk).
 */
export const STYLES: Record<string, { label: string; category: string; desc: string }> = {
  "transformers-robot": { label: "Transformer", category: "Mech", desc: "a cinematic Transformers-style transforming robot — metallic panels, robotic joints, glowing mechanical details, heroic meme energy" },
  "cyber-mech":         { label: "Cyber-Mech", category: "Mech", desc: "a sleek armored cyber-mech with carbon-fibre plating, exposed servos, neon underglow, hard-surface sci-fi detail" },
  "marble-statue":      { label: "Marble Statue", category: "Sculpture", desc: "a flawless white Carrara marble statue on a plinth, chiselled folds, museum lighting, fine veining" },
  "bronze-bust":        { label: "Bronze Idol", category: "Sculpture", desc: "an ancient cast-bronze idol with green patina and gold-leaf accents, lit like a museum artifact" },
  "gold-idol":          { label: "Solid Gold", category: "Sculpture", desc: "cast in solid polished gold, reflective and opulent, dramatic rim light, luxury collector feel" },
  "anime":              { label: "Anime", category: "Illustrated", desc: "a high-detail anime / cel-shaded illustration, bold linework, dynamic shading, expressive and clean" },
  "comic-ink":          { label: "Comic Ink", category: "Illustrated", desc: "a gritty inked comic-book panel, heavy blacks, halftone shading, dramatic crosshatching" },
  "vaporwave":          { label: "Vaporwave", category: "Illustrated", desc: "an 80s vaporwave aesthetic — magenta/cyan neon, chrome, grid horizon, retro-futuristic glow" },
  "graffiti":           { label: "Graffiti", category: "Illustrated", desc: "a bold street-art graffiti mural version, spray-paint texture, drips, vivid outlines on concrete" },
  "skeleton-lich":      { label: "Lich", category: "Dark", desc: "a skeletal lich form wreathed in eerie soul-fire, cracked bone, glowing sockets, gothic and ominous" },
  "lego":               { label: "Brick Toy", category: "Toy", desc: "rebuilt entirely from plastic toy building bricks, glossy studs, playful, on a clean studio backdrop" },
  "claymation":         { label: "Claymation", category: "Toy", desc: "a handmade stop-motion claymation figure, visible thumbprints and clay texture, charming and tactile" },
  "pixel-art":          { label: "Pixel Art", category: "Toy", desc: "16-bit pixel-art sprite version, crisp pixels, limited palette, retro game character energy" },
};

export function isValidStyle(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(STYLES, key);
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

/**
 * TRANSFORM prompt — the inverse of buildImagePrompt: it REIMAGINES the figure as
 * a style while preserving identity cues (the glowing geometric hex face, robe
 * silhouette, palette) and keeping the original background unchanged. This is the
 * productized "Transformers" effect the community made by hand.
 */
function buildTransformPrompt(citizen: Citizen, styleDesc: string): string {
  return [
    `Reimagine the character in the reference image as ${styleDesc}.`,
    "CRITICAL: keep it recognizably the SAME character — same pose, same silhouette, same proportions,",
    "and preserve its signature glowing geometric HEX where a face would be plus its robe/hood shape and colour palette.",
    "Do NOT add a human face, eyes, or hair. Reinterpret its form/material in the new style only.",
    "Keep the ORIGINAL background and composition essentially unchanged — transform ONLY the character itself,",
    "composited naturally back into the same scene with matching light.",
    `This is FREELON CITY citizen #${id4(citizen.id)} (${citizen.civilization}).`,
    "Premium render, dramatic light, collector-grade, readable at thumbnail size. Square 1:1.",
  ].join(" ");
}

/** Prompt for a CREW transform — BOTH citizens (from the two reference images)
 *  reimagined together as a duo in one style. Preserves each one's identity. */
function buildCrewTransformPrompt(a: Citizen, b: Citizen, styleDesc: string): string {
  return [
    `Combine the TWO characters from the reference images into ONE square scene, both reimagined as ${styleDesc}.`,
    "CRITICAL: keep BOTH recognizably themselves — preserve each one's glowing geometric HEX where a face would be,",
    "its robe/hood shape and its colour palette. Do NOT add human faces, eyes, or hair to either.",
    "Pose them together as a duo/crew, side by side, interacting naturally, sharing one cohesive background and matching dramatic light.",
    `Character one is FREELON CITY citizen #${id4(a.id)} (${a.civilization}); character two is #${id4(b.id)} (${b.civilization}).`,
    "Premium render, collector-grade, both clearly readable at thumbnail size. Square 1:1.",
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
  /** Either a scene key (changes setting) OR a style key (transforms the figure). */
  sceneKey?: string;
  styleKey?: string;
  timeoutMs?: number;
}): Promise<ImageGenResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_api_key" };
  // Exactly one of scene/style (contract enforcement — never both/neither).
  if (!!args.styleKey === !!args.sceneKey) return { ok: false, error: "bad_render_args" };
  const isStyle = !!args.styleKey;
  const renderKey = isStyle ? args.styleKey! : args.sceneKey!;
  if (isStyle ? !isValidStyle(renderKey) : !isValidScene(renderKey)) {
    return { ok: false, error: isStyle ? "invalid_style" : "invalid_scene" };
  }

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

  const prompt = isStyle
    ? buildTransformPrompt(args.citizen, STYLES[renderKey].desc)
    : buildImagePrompt(args.citizen, args.spec, SCENES[renderKey].desc);

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
    const filename = `deploy/${id4(args.citizen.id)}-${renderKey}-${Date.now()}.png`;
    const { stampSignature } = await import("@/lib/missions/image-stamp");
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

// ─── EVOLVE — opt-in, revertable art evolution — 2026-06-06 ─────────────────
// Reuses this exact pipeline (fetch real art → gpt-image-1.5 edit → stamp →
// Blob) to render a TIER-APPROPRIATE on-brand UPGRADE of the citizen's own art.
// Identity is non-negotiable (same figure, hex face, civ palette, iconic at
// thumbnail) — evolution only INTENSIFIES the awakened form, it never replaces
// the character. The strength scales with the evolve tier.
const EVOLVE_TIER_DESC: Record<number, string> = {
  1: "a subtle awakening — add a faint living aura and a gentle rim of light around the figure, the hex face glowing a touch brighter. Restrained, premium, barely-there.",
  2: "an ascended form — a stronger radiant aura, energy motes drifting upward, the hex face burning bright as a key light, faint geometric glyphs orbiting the silhouette.",
  3: "a fully awakened apex form — a commanding halo of signal-energy, volumetric light streaming from the hex face, crackling geometric power and a luminous corona, monumental and iconic.",
};

/** Build the EVOLVE prompt: keep identity locked, intensify the awakened form by
 *  tier. Same identity-lock-FIRST discipline as buildImagePrompt. */
function buildEvolvePrompt(citizen: Citizen, tier: number): string {
  const upgrade = EVOLVE_TIER_DESC[tier] ?? EVOLVE_TIER_DESC[1];
  return [
    "Keep the figure in the reference image EXACTLY: its faceted sculptural head/helm, the glowing",
    "geometric HEX symbol where a face would be, its robes, its exact colour palette and materials.",
    "Do NOT add a human face, eyes, hair, or turn it into a person or cartoon. Same character, same silhouette, same pose.",
    `This is FREELON CITY citizen #${id4(citizen.id)} (${citizen.civilization}, ${citizen.tier}).`,
    `EVOLVE it — keep the SAME character and background but elevate it: ${upgrade}`,
    "Premium dark cinematic render, the hex glowing as a key light source. Collector-grade, readable at thumbnail size. Square 1:1.",
  ].join(" ");
}

/**
 * Render an EVOLVED version of a citizen's own art for the opt-in evolution
 * feature. Tier drives how strong the visual upgrade is. Returns a public Blob
 * URL (branded), exactly like generateCitizenScene. Provider-guarded: returns
 * { ok:false, error:"no_api_key" } if OPENAI_API_KEY is unset (caller 503s
 * BEFORE charging ⬡).
 */
export async function generateEvolvedArt(args: {
  citizen: Citizen;
  tier: number;
  timeoutMs?: number;
}): Promise<ImageGenResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_api_key" };
  const tier = Math.max(1, Math.floor(args.tier));

  const ref = await fetchRefArt(args.citizen.id);
  if (!ref) return { ok: false, error: "reference_art_missing" };

  const prompt = buildEvolvePrompt(args.citizen, tier);
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("image", new Blob([new Uint8Array(ref)], { type: "image/jpeg" }), `${id4(args.citizen.id)}.jpg`);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), args.timeoutMs ?? 90_000);
  try {
    const res = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `openai_${res.status}` };
    const j = (await res.json()) as { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    const b64 = j.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "empty_image" };

    const filename = `evolve/${id4(args.citizen.id)}-t${tier}-${Date.now()}.png`;
    const { stampSignature } = await import("@/lib/missions/image-stamp");
    const bytes = await stampSignature(Buffer.from(b64, "base64"), args.citizen.id);
    let blob;
    try {
      blob = await put(filename, bytes, { access: "public", contentType: "image/png" });
    } catch (e) {
      return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
    }
    return { ok: true, url: blob.url, filename, promptTokens: j.usage?.input_tokens, imageTokens: j.usage?.output_tokens };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "AbortError" ? "timeout" : "fetch_failed" };
  } finally {
    clearTimeout(t);
  }
}

/** Fetch a citizen's hosted reference art (timeout-guarded). */
async function fetchRefArt(id: number): Promise<Buffer | null> {
  try {
    const c = new AbortController();
    const rt = setTimeout(() => c.abort(), 15_000);
    const res = await fetch(imageUrl(id), { signal: c.signal }).finally(() => clearTimeout(rt));
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * GROUP TRANSFORM — render TWO owned citizens together in one branded style image.
 * The "hold more than one" visual product. Same pipeline as generateCitizenScene
 * (allowlisted style key, branded + uploaded to Blob), but two reference images.
 */
export async function generateCrewTransform(args: {
  citizenA: Citizen;
  citizenB: Citizen;
  styleKey: string;
  timeoutMs?: number;
}): Promise<ImageGenResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_api_key" };
  if (!isValidStyle(args.styleKey)) return { ok: false, error: "invalid_style" };

  const a = await fetchRefArt(args.citizenA.id);
  const b = await fetchRefArt(args.citizenB.id);
  if (!a || !b) return { ok: false, error: "reference_art_missing" };

  const prompt = buildCrewTransformPrompt(args.citizenA, args.citizenB, STYLES[args.styleKey].desc);
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("image[]", new Blob([new Uint8Array(a)], { type: "image/jpeg" }), `${id4(args.citizenA.id)}.jpg`);
  form.append("image[]", new Blob([new Uint8Array(b)], { type: "image/jpeg" }), `${id4(args.citizenB.id)}.jpg`);

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
    const j = (await res.json()) as { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    const b64 = j.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "empty_image" };

    const filename = `deploy/crew-${id4(args.citizenA.id)}-${id4(args.citizenB.id)}-${args.styleKey}-${Date.now()}.png`;
    const { stampSignature } = await import("@/lib/missions/image-stamp");
    const bytes = await stampSignature(Buffer.from(b64, "base64"), args.citizenA.id);
    let blob;
    try {
      blob = await put(filename, bytes, { access: "public", contentType: "image/png" });
    } catch (e) {
      return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
    }
    return { ok: true, url: blob.url, filename, promptTokens: j.usage?.input_tokens, imageTokens: j.usage?.output_tokens };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "AbortError" ? "timeout" : "fetch_failed" };
  } finally {
    clearTimeout(t);
  }
}
