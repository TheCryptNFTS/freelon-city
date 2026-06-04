/**
 * "Deploy Citizen" resolver — INTERNAL/TEST ONLY, no payments.
 *
 * Renders the citizen into one of three server-allowlisted cinematic scenes off
 * its REAL shipped art, keeping its faceted-monolith + hex-face identity. The
 * scene is passed as the mission input (a scene KEY, validated against the
 * allowlist — never a free-form prompt). On success the endpoint awards XP and
 * writes a memory entry ("Deployed into [scene]"); the image URL rides in the
 * output meta + a focus hint so the citizen's history records what it did.
 */

import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { deriveSpec } from "@/lib/specialization";
import { generateCitizenScene, isValidScene, SCENES } from "@/lib/missions/image-gen";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

export async function deployResolver(ctx: MissionContext): Promise<MissionOutput> {
  const sceneKey = ctx.input.trim();
  if (!sceneKey || !isValidScene(sceneKey)) {
    return {
      ok: false,
      title: "Pick a scene",
      body: "",
      error: `Choose a scene: ${Object.keys(SCENES).join(", ")}.`,
    };
  }

  const spec = deriveSpec(ctx.progress);
  const result = await generateCitizenScene({ citizen: ctx.citizen, spec, sceneKey });

  if (!result.ok) {
    return {
      ok: false,
      title: "Deployment failed",
      body: "",
      error:
        result.error === "timeout"
          ? "The render timed out — nothing was charged. Try again."
          : "The citizen could not be deployed right now — try again shortly.",
    };
  }

  const scene = SCENES[sceneKey];
  const name = ctx.citizen.transmission_name || ctx.citizen.honoree || `Citizen #${id4(ctx.citizen.id)}`;
  return {
    ok: true,
    title: `${name} · deployed into ${scene.label}`,
    // body holds the rendered image URL (UI renders it as an <img>).
    body: result.url,
    meta: {
      kind: "image",
      imageUrl: result.url,
      scene: sceneKey,
      sceneLabel: scene.label,
      // focus = the scene, so repeat deployments accrue into the citizen's history
      focus: sceneKey,
      level: ctx.progress.level,
    },
  };
}
