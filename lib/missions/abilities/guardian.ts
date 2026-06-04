/**
 * DESIGNER — the visual agent. Generates visual concepts, image prompts, and
 * naming for the holder's brand/drop. (The citizen-into-scene IMAGE render is
 * the separate "deploy" resolver, also gated on the design skill.)
 * (File name kept as guardian.ts for import stability; ability = DESIGN.)
 */
import { type Ability, GUARDRAILS } from "@/lib/missions/abilities/ability";

export const DESIGN: Ability = {
  id: "design",
  label: "Design",
  blurb: "Generates visual concepts, image prompts, and names for your brand or drop.",
  instruction:
    "You are the holder's design agent. Produce concrete visual direction they can act on or hand " +
    "to an image model. Be specific about style, palette, composition. Higher-level agents give " +
    "richer, more cohesive direction.",
  guardrail: GUARDRAILS.CREATE,
  modelTask: "basicConsult",
  tasks: [
    { key: "concept", label: "Visual concept", instruction: "Give a clear visual concept for the holder's brief: style, palette, mood, key elements." },
    { key: "prompt", label: "Image prompt", instruction: "Write a detailed image-generation prompt for the holder's idea, ready to paste into an image model." },
    { key: "name", label: "Name & brand", instruction: "Suggest a short list of names/brand directions for the holder's brief, each with a one-line why." },
  ],
};

// Back-compat export name used by the registry (kept stable).
export const GUARDIAN = DESIGN;
