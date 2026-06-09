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
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import type { StampMeta } from "@/lib/missions/image-stamp";
// NOTE: the JSX stamp (image-stamp.tsx) is loaded via DYNAMIC import at generation
// time, NOT a static import — so test/tooling that pulls this module for SCENES or
// the resolver's scene-validation never has to parse the JSX.

const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-1.5";

/** True when the image provider is configured. Images run through OpenRouter
 *  ONLY (direct OpenAI is billing-capped and disabled for renders), so this
 *  gates on the OpenRouter key — the pre-charge guard must match the provider
 *  the renderer will actually use, so a holder is never charged for a render
 *  that can't run. */
function hasImageProvider(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

type EditResult =
  | { ok: true; b64: string; usage?: { input?: number; output?: number } }
  | { ok: false; error: string };

/** Transient failures worth a retry: connection kills (the Vercel↔OpenRouter
 *  idle-proxy reset), self-timeouts, and provider 5xx / 429. A 4xx (billing
 *  cap, bad request) will never recover, so we DON'T retry those. */
function isRetryable(error: string): boolean {
  return (
    error.startsWith("fetch_failed") ||
    error === "timeout" ||
    error === "empty_image" ||
    /_(5\d\d|429)\b/.test(error) ||
    /_(5\d\d|429):/.test(error)
  );
}

/**
 * Render an image EDIT (reference art → new image) through whichever provider is
 * configured, with a retry on TRANSIENT failures. OpenRouter (when
 * OPENROUTER_API_KEY is set) is preferred — it's the same account that powers
 * chat, so direct-OpenAI billing caps don't take images down. The Vercel↔OpenRouter
 * hop occasionally resets an idle connection mid-render (→ "fetch_failed") even
 * though the model itself is healthy, so a single retry turns most blips into a
 * success instead of a dead, refunded render. OpenRouter exposes the image line as
 * a chat-completions model with an image modality (reference passed as a data URI),
 * NOT the multipart images/edits endpoint — so the request shape differs by
 * provider. Falls back to direct OpenAI images/edits when only OPENAI_API_KEY is
 * set. Self-times-out per attempt.
 */
async function editToB64(
  prompt: string,
  refs: Buffer[],
  quality: "low" | "medium" | "high",
  timeoutMs: number,
): Promise<EditResult> {
  // Per-attempt timeout so two tries still fit comfortably under the route's
  // 300s ceiling (the fast image model returns in <15s, so 2× is cheap).
  const perAttempt = Math.max(30_000, Math.floor(timeoutMs / 2));
  let last: EditResult = { ok: false, error: "unknown" };
  for (let attempt = 0; attempt < 2; attempt++) {
    last = await editAttempt(prompt, refs, quality, perAttempt);
    if (last.ok || !isRetryable(last.error)) return last;
    // brief backoff before the retry; transient resets clear quickly
    await new Promise((r) => setTimeout(r, 400 + attempt * 600));
  }
  return last;
}

async function editAttempt(
  prompt: string,
  refs: Buffer[],
  quality: "low" | "medium" | "high",
  timeoutMs: number,
): Promise<EditResult> {
  // Images go through OpenRouter ONLY. Direct OpenAI (images/edits) is disabled
  // for renders because that account is billing-capped — falling back to it just
  // produced opaque `billing_hard_limit_reached` 400s. OpenRouter is the same
  // account that powers chat and is healthy. `quality` is unused on the
  // OpenRouter chat-completions image path (kept in the signature for the API).
  void quality;
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!orKey) return { ok: false, error: "no_api_key" };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Default to a FAST image model. openai/gpt-5-image is high quality but
    // takes ~85s, which a proxy between Vercel and OpenRouter kills as an idle
    // connection (~20s) before it returns any bytes → "fetch_failed" in prod
    // even though it works locally. gemini-2.5-flash-image returns in seconds
    // (dodging the timeout) and is ~6× cheaper, while still doing a faithful
    // reference edit. Override with OPENROUTER_IMAGE_MODEL.
    const model = process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image";
    const content = [
      { type: "text", text: prompt },
      ...refs.map((r) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${r.toString("base64")}` } })),
    ];
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.freeloncity.com",
        "X-Title": "FREELON CITY",
      },
      body: JSON.stringify({ model, modalities: ["image", "text"], messages: [{ role: "user", content }], stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `openrouter_${res.status}:${(await res.text().catch(() => "")).slice(0, 100)}` };
    const j = (await res.json()) as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
    const b64 = url.startsWith("data:") ? url.slice(url.indexOf(",") + 1) : "";
    if (!b64) return { ok: false, error: "empty_image" };
    return { ok: true, b64, usage: { input: j.usage?.prompt_tokens, output: j.usage?.completion_tokens } };
  } catch (e) {
    if ((e as Error).name === "AbortError") return { ok: false, error: "timeout" };
    // Surface the real cause (undici puts the reason in .cause.code) so a
    // connection-level failure isn't an opaque "fetch_failed".
    const cause = (e as { cause?: { code?: string } }).cause?.code;
    return { ok: false, error: `fetch_failed:${cause || (e as Error).message || ""}`.slice(0, 100) };
  } finally {
    clearTimeout(t);
  }
}

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
  // ── TRANSMISSION POSTER LOOKS (2026-06-09, from POSTER_LOOK_BANK.md) ──────────
  // Same allowlist mechanism + flat deploy-citizen cost — these just widen the
  // cinematic variety so the render becomes shareable "city media", not one look.
  // Aesthetics intentionally varied (the marketing lane is NOT the strict canon).
  "rain-neon-district": {
    label: "Neon District",
    desc: "on a rain-slick neon megacity street at night, reflections in wet stone, volumetric haze, distant signage glow raking across the figure, cinematic Blade Runner mood",
  },
  "storm-monolith": {
    label: "Storm Monolith",
    desc: "tiny and monumental before a colossal brutalist monolith under violent storm light, lightning-lit clouds, Dune-scale awe, cloth caught in the wind",
  },
  "eclipse-ring": {
    label: "Black Eclipse",
    desc: "silhouetted in the burning gold corona of a total black-sun eclipse over a dead city skyline, awe and dread, rim-lit edges",
  },
  "frozen-vault": {
    label: "Frozen Vault",
    desc: "inside an ice-locked archive vault, frost on gold seams, breath-fog in pale archive light, a single thawing signal-record glowing nearby",
  },
  "aurora-wastes": {
    label: "Aurora Wastes",
    desc: "alone on a cracked salt-flat under a vast aurora of gold and violet signal-light, cosmic loneliness, lone monumental figure, distant ruins",
  },
  "noir-spotlight": {
    label: "Noir File",
    desc: "under a single hard film-noir spotlight in deep shadow, drifting smoke, venetian-blind light bars across the figure, classified-record tension",
  },
  // ── WAVE 2 (2026-06-09) — more cinematic variety from POSTER_LOOK_BANK.md ─────
  "stained-glass": {
    label: "Stained Glass",
    desc: "framed in a towering gothic cathedral stained-glass window, the figure rendered as a saint of the signal, colored light pouring through the panes, sacred and still",
  },
  "desert-monolith": {
    label: "Dune Pilgrim",
    desc: "a lone pilgrim crossing an endless dune sea under twin moons, a distant monolith on the horizon, vast warm dusk light, 2001-meets-Dune awe",
  },
  "data-cathedral": {
    label: "Data Cathedral",
    desc: "inside a cathedral of glowing data-glass and floating glyphs, sacred geometry, raking light through tall columns, quiet and immense",
  },
  "ember-forge": {
    label: "Signal Forge",
    desc: "before a towering wall of signal-fire in a dark war-hall, drifting embers and sparks, hero-lit from below, heat-haze rising",
  },
  "circuit-relic": {
    label: "Excavated Relic",
    desc: "presented as a freshly excavated circuit-relic half-buried in dark earth, gold traces and dirt, lit like a museum dig-find, archaeology of the future",
  },
  "monsoon-temple": {
    label: "Lost Temple",
    desc: "in a rain-drenched jungle-overgrown temple ruin, gold idols under hanging vines, warm storm light breaking through, Apocalypto-meets-sci-fi",
  },
  "chrome-liquid": {
    label: "Liquid Chrome",
    desc: "the figure half-dissolving into reflective liquid chrome and mercury, surreal distortion, high-fashion sci-fi, stark studio rim-light",
  },
  "bioluminescent-deep": {
    label: "Deep Signal",
    desc: "drifting in pressure-black deep ocean, surrounded by slow bioluminescent gold motes, eerie calm, a single faraway glow",
  },
  "victory-banners": {
    label: "Triumph",
    desc: "raised on a dais above drifting banners and embers, a vast hall fading into shadow behind, triumphant and monumental, hero-lit",
  },
  "vhs-surveillance": {
    label: "Surveillance",
    desc: "a grainy low-light surveillance still, faint scanlines and a corner timestamp overlay, CAM-07 framing, found-footage tension",
  },
  // ── WAVE 3 (2026-06-09) — more cinematic variety from POSTER_LOOK_BANK.md ─────
  "marble-relief": {
    label: "Marble Relief",
    desc: "carved into a classical marble bas-relief frieze with gold inlay, a procession behind, antiquity-meets-future, museum lighting",
  },
  "shattered-mirror": {
    label: "Shattered Mirror",
    desc: "reflected and fractured across a wall of shattered mirror shards, identity-splinter theme, sharp light edges, surreal and cold",
  },
  "ash-snow": {
    label: "Ash Snow",
    desc: "standing as grey ash falls like snow over ruined streets, muted desaturation, a single warm gold ember glowing on the figure, melancholic grandeur",
  },
  "blueprint-schematic": {
    label: "Schematic",
    desc: "rendered as a technical blueprint of the figure, white linework on deep blueprint-blue, annotation marks and exploded-diagram callouts, cold and precise",
  },
  "throne-storm": {
    label: "Storm Throne",
    desc: "seated on a high throne as a lightning storm rages through tall broken windows behind, regal and ominous, rain and gold light",
  },
  "undercity-tunnel": {
    label: "Undercity",
    desc: "deep in a flooded undercity tunnel, knee-deep black water, a single shaft of light from a grate above, dripping concrete and gold reflections",
  },
  "orbital-window": {
    label: "Orbital",
    desc: "before a vast orbital station window with the curve of a dark planet below, cold starlight and warm interior glow, lonely sci-fi scale",
  },
  "festival-lanterns": {
    label: "Lantern Night",
    desc: "amid a night festival of floating gold lanterns rising over a dark city, warm bokeh, quiet awe, the figure watching them ascend",
  },
  "obsidian-throne-hall": {
    label: "Obsidian Hall",
    desc: "alone in a colossal obsidian hall lined with dim gold braziers, mirror-black floor, monumental emptiness, a single distant light",
  },
  "wanted-broadcast": {
    label: "Wanted",
    desc: "framed like an official city WANTED broadcast: weathered metal-parchment texture, aged warning borders and stamps, harsh frontal light, space reserved for record text",
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
  "vaporwave":          { label: "Vaporwave", category: "Illustrated", desc: "an 80s vaporwave aesthetic — violet and gold neon, chrome, grid horizon, retro-futuristic glow" },
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

// ─── TRAIT INJECTION — 2026-06-09 ───────────────────────────────────────────
// The render's moat is the token's REAL traits, which a blank GPT tab can't
// know. We lead the prompt with the citizen's SHAPE silhouette (our IP — the 16
// canonical shapes), make the hex eye glow the civ's CANONICAL colour as key
// light, and scale form-strangeness by TIER. This turns a generic "hooded
// figure" prompt into one only #N's data produces.

/** The 16 canonical shapes → a silhouette directive (drawn from SHAPES lore in
 *  constants). Shape drives the silhouette FIRST. */
const SHAPE_SILHOUETTE: Record<string, string> = {
  "Geometric Hood Main": "a hooded faceted figure with a clean, readable silhouette",
  "Geometric Hood Variant": "a hooded faceted figure with deep, aggressive hood angles",
  "Lumen": "a luminous arrow-tipped ceremonial candle-form",
  "Mask": "a faceted figure wearing a separate ceremonial mask over the face",
  "Chained": "a hooded figure with hex-chain veils hanging from the hood",
  "Archon": "a broad authority form with a full hex-mesh tessellated face",
  "Veil": "a faceless head behind a translucent geometric veil",
  "Crown-Bearer": "a hooded figure crowned with a structural geometric crown",
  "Horned": "a hooded figure with hex-shaped horns rising from the crown",
  "Halo": "a round seamless faceless head — a glowing void framed by a gold halo",
  "Monolith": "a tall pyramidal faceless monolith-hood with a single vertical hex line, minimal limbs",
  "Split": "a cathedral-spire helm with a plague-mask cheek piece",
  "Antenna": "a figure with multiple gold transmission antennae rising vertically",
  "Prism": "an angular sword-shaped head with a single glowing strip",
  "Shard": "a pure pointed cone helm — a brutalist monolith form",
  "Sanctum": "a high pointed gothic cathedral-arch head — the rarest sacred form",
};
function shapeSilhouette(shape: string): string {
  return SHAPE_SILHOUETTE[shape] || "a hooded faceted figure with a readable silhouette";
}

/** Tier → how abstract / monumental the form reads. Tier drives form-strangeness. */
function tierForm(tier: string): string {
  const t = (tier || "").toLowerCase();
  if (t.includes("one of one")) return "a singular, impossible apex artifact, the form fully abstracted into monumental architecture";
  if (t.includes("legendary")) return "fully abstract, monumental architecture at awe-scale — the figure as a relic";
  if (t.includes("epic") || t.includes("honorary")) return "an exotic, architectural form — the figure as an artifact more than a person";
  if (t.includes("rare")) return "a form beginning to abstract, its faceting more pronounced and strange";
  return "a restrained, readable form";
}

/** Civ → the hex-eye key-light phrase, keyed to the civ's CANONICAL colour +
 *  doctrine (source of truth: CIVILIZATIONS). */
function civLight(slug: string): string {
  const civ = (CIVILIZATIONS as Record<string, { doctrine: string; color: string }>)[slug];
  if (!civ) return "its own signal-light";
  return `${civ.color} ${civ.doctrine}-signal light`;
}

/** Build the per-render provenance/house-look metadata the stamp burns in. */
function stampMetaForCitizen(c: Citizen): StampMeta {
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string; stamp: string; color: string }>)[c.civilization];
  return {
    civName: civ?.name,
    doctrine: civ?.doctrine,
    tier: c.tier,
    color: civ?.color,
    archiveCode: civ ? `${civ.stamp}-${id4(c.id)}` : `#${id4(c.id)}`,
  };
}

/** The proven identity-lock-FIRST prompt, now TRAIT-DRIVEN. Identity is
 *  non-negotiable; the scene is the only thing that changes. Shape, civ colour
 *  and tier are injected so the render is one only this token's data produces. */
function buildImagePrompt(citizen: Citizen, spec: Specialization, sceneDesc: string): string {
  const civ = (CIVILIZATIONS as Record<string, { name: string }>)[citizen.civilization];
  const civName = civ?.name || citizen.civilization;
  const classLine =
    spec.cls === "drifter"
      ? "an untrained citizen"
      : `a ${spec.className} (${spec.rank.label})`;
  return [
    `Keep the figure in the reference image EXACTLY: ${shapeSilhouette(citizen.shape)}, its faceted sculptural head/helm,`,
    "the glowing geometric HEX symbol where a face would be, its robes, its exact colour palette and materials.",
    "Do NOT add a human face, eyes, hair, or turn it into a person or cartoon. Same character, same silhouette.",
    `This is FREELON CITY citizen #${id4(citizen.id)} — a ${civName} ${citizen.caste}, ${classLine}, ${citizen.tier}. Render it as ${tierForm(citizen.tier)}.`,
    `Its hex face glows ${civLight(citizen.civilization)} as the key light source.`,
    `Only change the SETTING to a cinematic scene: ${sceneDesc}.`,
    "Premium dark cinematic render on a lifted near-black background (never pure black), strong rim lighting, dramatic volumetric light, a big bright hex eye and an extreme, readable silhouette.",
    "Collector-grade, reads clearly at 40×40 thumbnail size. No weapons. Square 1:1.",
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
  if (!hasImageProvider()) return { ok: false, error: "no_api_key" };
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

  // 240s default leaves ~60s headroom under the route's 300s ceiling for the
  // reference fetch, signature stamp, and Blob upload — so a real overrun aborts
  // cleanly (→ refundable "timeout") instead of the platform killing the function.
  const r = await editToB64(prompt, [refBytes], "medium", args.timeoutMs ?? 240_000);
  if (!r.ok) return r;
  const b64 = r.b64;
  {
    // Upload to Vercel Blob (public) → a real, shareable, persistent URL. The
    // filesystem is read-only on Vercel, so we can't write to /public anymore.
    // The image is BRANDED with a FREELON signature first (free marketing on share).
    // Auth: the SDK uses BLOB_READ_WRITE_TOKEN if present, else the project's OIDC
    // connection. We DON'T pre-guard on the env token (OIDC-connected stores don't
    // set it) — instead we let put() try and surface its real error if it fails.
    const filename = `deploy/${id4(args.citizen.id)}-${renderKey}-${Date.now()}.png`;
    const { stampSignature } = await import("@/lib/missions/image-stamp");
    const bytes = await stampSignature(Buffer.from(b64, "base64"), args.citizen.id, stampMetaForCitizen(args.citizen));
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
      promptTokens: r.usage?.input,
      imageTokens: r.usage?.output,
    };
  }
}

// ─── SISTER-COLLECTION SCENE RENDER — 2026-06-09 ────────────────────────────
// Generates a cinematic scene for a NON-FREELONS token (Crypt / OOGIES / Emile /
// SMILES) from THAT token's own hosted art. Reuses the exact pipeline (fetch ref
// → editToB64 → stamp → Blob) but with a GENERIC identity-preserving prompt:
// sisters are not hooded-hex citizens, so we lock to whatever the reference IS
// (a card, a creature, a fragment) and only change the SETTING. Same SCENES
// allowlist. Cost/caps are enforced by the caller (sister route), not here.
function buildSisterScenePrompt(label: string, collectionName: string, sceneDesc: string): string {
  return [
    "Keep the SUBJECT in the reference image EXACTLY as it is: same character/object, same shapes,",
    "same colours, same materials and proportions. Do NOT redesign it, do NOT add or remove features,",
    "do NOT turn it into a different creature or a generic human.",
    `This is "${label}" from the FREELON CITY collection ${collectionName}.`,
    `Only change the SETTING / background to a cinematic scene: ${sceneDesc}.`,
    "Composite the original subject naturally into the new scene with matching dramatic light.",
    "Premium dark cinematic render, collector-grade, readable at thumbnail size.",
  ].join(" ");
}

export async function generateSisterScene(args: {
  slug: string;
  tokenId: number;
  /** The token's own hosted art URL (CollectionToken.img). */
  artUrl: string;
  /** Display name for the prompt (e.g. the token name). */
  label: string;
  collectionName: string;
  sceneKey: string;
  timeoutMs?: number;
}): Promise<ImageGenResult> {
  if (!hasImageProvider()) return { ok: false, error: "no_api_key" };
  if (!isValidScene(args.sceneKey)) return { ok: false, error: "invalid_scene" };

  let refBytes: Buffer;
  try {
    const ctrl = new AbortController();
    const rt = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(args.artUrl, { signal: ctrl.signal }).finally(() => clearTimeout(rt));
    if (!res.ok) return { ok: false, error: "reference_art_missing" };
    refBytes = Buffer.from(await res.arrayBuffer());
  } catch {
    return { ok: false, error: "reference_art_missing" };
  }

  const prompt = buildSisterScenePrompt(args.label, args.collectionName, SCENES[args.sceneKey].desc);
  const r = await editToB64(prompt, [refBytes], "medium", args.timeoutMs ?? 240_000);
  if (!r.ok) return r;

  const safeSlug = args.slug.replace(/[^a-z0-9-]/gi, "");
  const filename = `sister/${safeSlug}-${id4(args.tokenId)}-${args.sceneKey}-${Date.now()}.png`;
  const { stampSignature } = await import("@/lib/missions/image-stamp");
  const bytes = await stampSignature(Buffer.from(r.b64, "base64"), args.tokenId, { collectionName: args.collectionName });
  let blob;
  try {
    blob = await put(filename, bytes, { access: "public", contentType: "image/png" });
  } catch (e) {
    return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
  }
  return { ok: true, url: blob.url, filename, promptTokens: r.usage?.input, imageTokens: r.usage?.output };
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
  if (!hasImageProvider()) return { ok: false, error: "no_api_key" };
  const tier = Math.max(1, Math.floor(args.tier));

  const ref = await fetchRefArt(args.citizen.id);
  if (!ref) return { ok: false, error: "reference_art_missing" };

  const prompt = buildEvolvePrompt(args.citizen, tier);
  const r = await editToB64(prompt, [ref], "high", args.timeoutMs ?? 240_000);
  if (!r.ok) return r;

  const filename = `evolve/${id4(args.citizen.id)}-t${tier}-${Date.now()}.png`;
  const { stampSignature } = await import("@/lib/missions/image-stamp");
  const bytes = await stampSignature(Buffer.from(r.b64, "base64"), args.citizen.id, stampMetaForCitizen(args.citizen));
  let blob;
  try {
    blob = await put(filename, bytes, { access: "public", contentType: "image/png" });
  } catch (e) {
    return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
  }
  return { ok: true, url: blob.url, filename, promptTokens: r.usage?.input, imageTokens: r.usage?.output };
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
  if (!hasImageProvider()) return { ok: false, error: "no_api_key" };
  if (!isValidStyle(args.styleKey)) return { ok: false, error: "invalid_style" };

  const a = await fetchRefArt(args.citizenA.id);
  const b = await fetchRefArt(args.citizenB.id);
  if (!a || !b) return { ok: false, error: "reference_art_missing" };

  const prompt = buildCrewTransformPrompt(args.citizenA, args.citizenB, STYLES[args.styleKey].desc);
  const r = await editToB64(prompt, [a, b], "medium", args.timeoutMs ?? 240_000);
  if (!r.ok) return r;

  const filename = `deploy/crew-${id4(args.citizenA.id)}-${id4(args.citizenB.id)}-${args.styleKey}-${Date.now()}.png`;
  const { stampSignature } = await import("@/lib/missions/image-stamp");
  const bytes = await stampSignature(Buffer.from(r.b64, "base64"), args.citizenA.id, stampMetaForCitizen(args.citizenA));
  let blob;
  try {
    blob = await put(filename, bytes, { access: "public", contentType: "image/png" });
  } catch (e) {
    return { ok: false, error: `blob_upload_failed:${(e as Error).message}`.slice(0, 120) };
  }
  return { ok: true, url: blob.url, filename, promptTokens: r.usage?.input, imageTokens: r.usage?.output };
}
