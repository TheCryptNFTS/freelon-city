/**
 * CREW BRIEF resolver (social, viral) — two citizens collaborate on one brief.
 *
 * The holder names a SECOND citizen by token id and a task/brief; THIS agent
 * frames a short output as if BOTH citizens worked the brief together — a crew
 * of two, each bringing their civilization's angle. Every result advertises two
 * NFTs and pulls another holder into the loop. Social by construction.
 *
 * Input format: "<otherTokenId> <task/brief>"  e.g. "404 design a welcome flow"
 */
import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";
import { modelFor } from "@/lib/missions/models";
import { getCitizen } from "@/lib/citizens";
import { deriveSpec } from "@/lib/specialization";
import { getProgress } from "@/lib/progression-store";
import { verifyOwnership } from "@/lib/owner-of";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}
function nameOf(c: { id: number; transmission_name: string; honoree: string }): string {
  return c.transmission_name || c.honoree || `Citizen #${id4(c.id)}`;
}

export async function crewResolver(ctx: MissionContext): Promise<MissionOutput> {
  const raw = ctx.input.trim();
  const m = raw.match(/^#?(\d{1,4})\b\s*([\s\S]*)$/);
  if (!m) {
    return {
      ok: false,
      title: "Name your crew partner",
      body: "",
      error: "Start with the other citizen's token number (1–4040), then the brief — e.g. \"404 design a welcome flow\".",
    };
  }
  const otherId = parseInt(m[1], 10);
  const brief = m[2].trim();
  if (otherId < 1 || otherId > 4040) {
    return { ok: false, title: "Invalid citizen", body: "", error: "That token number isn't 1–4040." };
  }
  if (otherId === ctx.citizen.id) {
    return { ok: false, title: "Need a different citizen", body: "", error: "A crew needs two — name another token to partner with." };
  }
  if (!brief) {
    return { ok: false, title: "Give the crew a brief", body: "", error: "Add the task or brief for the two citizens to work after the token number." };
  }
  const other = getCitizen(otherId);
  if (!other) {
    return { ok: false, title: "Citizen not found", body: "", error: "Couldn't find that citizen." };
  }

  // OWNED-ONLY: a crew is FREELONs YOU hold — this is the "reason to own more
  // than one" driver, and it stops anyone crewing with citizens they don't own.
  // The route already verified the primary (running) citizen; here we verify the
  // PARTNER. A failed/unknown check returns ok:false → the route refunds the ⬡,
  // so nothing is charged for a blocked crew. (Admin/test runs without a real
  // wallet skip the on-chain check.)
  if (/^0x[a-f0-9]{40}$/.test((ctx.walletAddress || "").toLowerCase())) {
    const v = await verifyOwnership(otherId, ctx.walletAddress);
    if (v.status === "not-owner") {
      return { ok: false, title: "Crew must be yours", body: "", error: `Your crew has to be FREELONs you own — you don't hold #${id4(otherId)}.` };
    }
    if (v.status !== "owner") {
      return { ok: false, title: "Couldn't verify your crew", body: "", error: `Couldn't confirm you own #${id4(otherId)} right now — your ⬡ was not charged. Try again.` };
    }
  }

  const persona = buildPersona(ctx.citizen, ctx.progress);
  const otherProg = await getProgress(otherId).catch(() => null);
  const otherSpec = otherProg ? deriveSpec(otherProg) : null;
  const otherName = nameOf(other);
  const otherRole = otherSpec && otherSpec.cls !== "drifter" ? `a ${otherSpec.className}` : "an untrained citizen";

  const system = [
    persona.system,
    `ABILITY — Crew Brief: You are working this brief as a CREW OF TWO with ${otherName} (#${id4(other.id)}), ${otherRole}. ` +
      `Produce ONE collaborative deliverable for the brief in the user message. ` +
      `HARD RULES: ` +
      `(1) Frame it as the two of you working together — make BOTH citizens visibly contribute, each from their own civilization's angle, and name ${otherName} where they take the lead. ` +
      `(2) Deliver something USABLE for the actual brief — concrete steps, ideas, or a plan — not just banter. ` +
      `(3) Open with a one-line "${nameOf(ctx.citizen)} × ${otherName}" framing, then the joint work. ` +
      `(4) Keep it tight (under ~200 words), specific to THIS brief, no generic filler. ` +
      `(5) NEVER mention price, value, worth, investment, returns, or chains.`,
  ].join("\n\n");

  const result = await citizenReason({
    system,
    user: brief,
    maxTokens: 450,
    model: modelFor("basicConsult"),
  });
  if (!result.ok) {
    return { ok: false, title: "The crew couldn't assemble", body: "", error: "The collaboration couldn't be staged — try again." };
  }

  return {
    ok: true,
    title: `${nameOf(ctx.citizen)} × ${otherName} · Crew Brief`,
    body: result.text,
    meta: { ability: "crew", task: "collab", withCitizen: otherId, level: ctx.progress.level },
  };
}
