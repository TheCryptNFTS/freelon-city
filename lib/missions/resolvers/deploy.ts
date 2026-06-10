/**
 * "Deploy Citizen" resolver — a HEX-priced premium image generation.
 *
 * Renders the citizen into one of the server-allowlisted cinematic scenes off its
 * REAL art, keeping its faceted-monolith + hex-face identity. The scene is passed
 * as the mission input (a scene KEY, validated against the allowlist — never a
 * free-form prompt). The output is hosted on Vercel Blob and branded with a
 * FREELON signature (see image-gen). On success the endpoint awards XP and writes
 * a memory entry; the image URL rides in the output meta + a focus hint.
 */

import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { deriveSpec } from "@/lib/specialization";
import { generateCitizenScene, isValidScene, isValidStyle, SCENES, STYLES } from "@/lib/missions/image-gen";
import { isValidFormKey } from "@/lib/reveal-forms";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

export async function deployResolver(ctx: MissionContext): Promise<MissionOutput> {
  // Input is either a scene KEY ("throne-room") or a style KEY prefixed "style:"
  // ("style:transformers-robot"). Both are server-allowlisted (no free prompt).
  // An optional "@<form>" suffix ("neon-city@geometric") picks which reveal
  // form of the citizen is the reference art — validated against what this
  // token actually HAS; anything else silently falls back to figurative.
  const raw0 = ctx.input.trim();
  const at = raw0.lastIndexOf("@");
  const formPart = at > 0 ? raw0.slice(at + 1).trim() : "";
  const raw = at > 0 ? raw0.slice(0, at).trim() : raw0;
  const formKey = formPart && isValidFormKey(ctx.citizen.id, formPart) ? formPart : undefined;
  const isStyle = raw.startsWith("style:");
  const renderKey = isStyle ? raw.slice("style:".length).trim() : raw;
  const valid = isStyle ? isValidStyle(renderKey) : isValidScene(renderKey);
  if (!renderKey || !valid) {
    return {
      ok: false,
      title: isStyle ? "Pick a style" : "Pick a scene",
      body: "",
      error: isStyle
        ? `Choose a style: ${Object.keys(STYLES).join(", ")}.`
        : `Choose a scene: ${Object.keys(SCENES).join(", ")}.`,
    };
  }

  const spec = deriveSpec(ctx.progress);
  const result = isStyle
    ? await generateCitizenScene({ citizen: ctx.citizen, spec, styleKey: renderKey, formKey })
    : await generateCitizenScene({ citizen: ctx.citizen, spec, sceneKey: renderKey, formKey });

  if (!result.ok) {
    // Make image failures OBSERVABLE — the raw code (no_blob_store / openai_400 /
    // reference_art_missing / empty_image) goes to the ops log so the operator can
    // see WHY a render failed instead of just the friendly message.
    import("@/lib/missions/ops-log")
      .then((m) => m.recordError(`deploy:${renderKey}`, new Error(result.error || "unknown"), { tokenId: ctx.citizen.id }))
      .catch(() => {});
    return {
      ok: false,
      title: "Deployment failed",
      body: "",
      error:
        result.error === "timeout"
          ? "The render timed out — your ⬡ was not charged. Try again."
          : `The render didn't complete (${result.error || "unknown"}) — your ⬡ was not charged. Try again shortly.`,
    };
  }

  const label = isStyle ? STYLES[renderKey].label : SCENES[renderKey].label;
  const name = ctx.citizen.transmission_name || ctx.citizen.honoree || `Citizen #${id4(ctx.citizen.id)}`;
  return {
    ok: true,
    title: isStyle ? `${name} · ${label}` : `${name} · deployed into ${label}`,
    // body holds the rendered image URL (UI renders it as an <img>).
    body: result.url,
    meta: {
      kind: "image",
      imageUrl: result.url,
      scene: renderKey,
      sceneLabel: label,
      // focus = the render key, so repeat deployments accrue into the citizen's history
      focus: renderKey,
      level: ctx.progress.level,
    },
  };
}
