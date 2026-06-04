/**
 * CITIZEN DOSSIER resolver ($19, premium) — the moat product.
 *
 * The citizen reads its EXISTING dossier on the holder, merges in the new info
 * from this brief, and writes back an updated living profile. Returns the
 * refreshed dossier. Because every future mission's persona can read this, the
 * agent genuinely sharpens over time — owned, persistent context ChatGPT can't
 * replicate. Premium model (it's reasoning over accumulated history).
 */
import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";
import { modelFor } from "@/lib/missions/models";
import { getDossier, setDossier } from "@/lib/missions/dossier-store";
import { briefIsStorable } from "@/lib/missions/memory-filter";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

export async function dossierResolver(ctx: MissionContext): Promise<MissionOutput> {
  const brief = ctx.input.trim();
  if (!brief) {
    return { ok: false, title: "Tell the citizen about you", body: "", error: "Add details about you or your project to build the dossier." };
  }
  if (!briefIsStorable(brief)) {
    return { ok: false, title: "Can't store that", body: "", error: "That can't be saved to the dossier — try a normal description." };
  }

  const existing = await getDossier(ctx.citizen.id);
  // Anti-chatbot moat: the dossier-builder also sees the agent's real past work.
  const { getAgentHistory, workDigest } = await import("@/lib/agent-history");
  const recentWork = await getAgentHistory(ctx.citizen.id).then(workDigest).catch(() => "");
  const persona = buildPersona(ctx.citizen, ctx.progress, undefined, { paid: ctx.paid, recentWork });

  const system = [
    persona.system,
    "ABILITY — Dossier: You maintain a PRACTICAL OPERATING PROFILE of your holder and their project — " +
      "not a generic summary, and not creepy personal surveillance. Its job is to make your FUTURE work for " +
      "them sharper. HARD RULES: " +
      "(1) Build it ONLY from what the holder actually told you (this brief + the existing dossier below). " +
      "Capture: project context, goals, audience, tone/voice, constraints, risks, preferences, and any useful " +
      "memory that would change how you'd help next time. " +
      "(2) SEPARATE facts from assumptions — put anything you inferred under a clearly-labelled 'Assumptions " +
      "(confirm)' heading, never mixed in as fact. " +
      "(3) Do NOT invent personal details, and do NOT overreach into private/sensitive territory they didn't " +
      "raise. Stick to what helps the work. " +
      "(4) NEVER include financial, investment, or value claims. " +
      "(5) Add a short 'How I'll use this' line explaining how this profile will improve your future jobs for them. " +
      "Merge new info into the existing profile: preserve what still matters, update what changed, drop nothing " +
      "important. " +
      "(6) END with a clean, self-contained 'USABLE DOSSIER' section under clear headings " +
      "(Who / Project / Goals / Audience / Voice / Constraints / Risks / Preferences / Assumptions (confirm) / " +
      "How I'll use this) — this is the part saved to memory. Output ONLY the updated profile.",
    existing
      ? `EXISTING DOSSIER (update this):\n${existing.profile}`
      : "EXISTING DOSSIER: (none yet — start a fresh profile from the new info.)",
  ].join("\n\n");

  const result = await citizenReason({
    system,
    user: brief,
    // Paid dossiers get room to finish the full structured profile (premium);
    // free/test dossiers run cheap + shorter.
    maxTokens: ctx.paid ? 1500 : 900,
    // COST GUARD: premium only when paid; a free (test-mode) dossier runs cheap.
    model: modelFor(ctx.paid ? "deepConsult" : "basicConsult"),
  });
  if (!result.ok) {
    return { ok: false, title: "Couldn't update the dossier", body: "", error: "The citizen couldn't be reached — try again." };
  }

  const saved = await setDossier(ctx.citizen.id, result.text);
  const name = ctx.citizen.transmission_name || ctx.citizen.honoree || `Citizen #${id4(ctx.citizen.id)}`;
  return {
    ok: true,
    title: `${name} · Dossier updated (v${saved.updates})`,
    body: saved.profile,
    meta: { ability: "dossier", task: "update", level: ctx.progress.level, version: saved.updates },
  };
}
