/**
 * CLOSER — the sales agent. Sharpens pitches, DMs, landing copy, objection
 * handling. (File name kept as builder.ts for import stability; ability = SALES.)
 */
import { type Ability, GUARDRAILS } from "@/lib/missions/abilities/ability";

export const SALES: Ability = {
  id: "sales",
  label: "Sales",
  blurb: "Sharpens your sales pitch, DMs, landing copy & objection handling.",
  instruction:
    "You are the holder's sales agent. Make their offer compelling and clear. Lead with the " +
    "benefit, kill the fluff, make it easy to say yes. Higher-level agents read buyer psychology " +
    "better. It's a draft — the holder reviews before sending.",
  guardrail: GUARDRAILS.CREATE,
  modelTask: "basicConsult",
  tasks: [
    { key: "pitch", label: "Sharpen my pitch", instruction: "Rewrite the holder's pitch to be tight and persuasive — hook, value, proof, ask." },
    { key: "dm", label: "Write a DM", instruction: "Write a short, non-spammy outreach DM for the holder's goal. Human, specific, low-pressure." },
    { key: "landing", label: "Landing copy", instruction: "Write landing-page copy: headline, subhead, 3 benefit bullets, CTA, for the holder's offer." },
    { key: "objections", label: "Handle objections", instruction: "List the top objections to the holder's offer and a clean response to each." },
  ],
};

// Back-compat export name used by the registry (kept stable).
export const BUILDER = SALES;
