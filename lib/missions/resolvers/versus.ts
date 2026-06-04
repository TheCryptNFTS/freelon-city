/**
 * AGENT VS AGENT resolver (social, viral) — one citizen RED-TEAMS another's idea.
 *
 * The holder names a SECOND citizen by token id and pitches an idea; THIS agent
 * tears into the idea in its own civilization-shaped voice, naming the other
 * citizen as the opponent whose pitch it is dismantling. The output is a sharp,
 * specific critique — the kind of pointed take holders screenshot and share. Two
 * NFTs in every result, another holder pulled into the loop. Social by design.
 *
 * Input format: "<otherTokenId> <your idea/pitch>"  e.g. "404 a daily streak quest"
 */
import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";
import { modelFor } from "@/lib/missions/models";
import { getCitizen } from "@/lib/citizens";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}
function nameOf(c: { id: number; transmission_name: string; honoree: string }): string {
  return c.transmission_name || c.honoree || `Citizen #${id4(c.id)}`;
}

export async function versusResolver(ctx: MissionContext): Promise<MissionOutput> {
  const raw = ctx.input.trim();
  const m = raw.match(/^#?(\d{1,4})\b\s*([\s\S]*)$/);
  if (!m) {
    return {
      ok: false,
      title: "Name the citizen to challenge",
      body: "",
      error: "Start with the other citizen's token number (1–4040), then your idea — e.g. \"404 a daily streak quest\".",
    };
  }
  const otherId = parseInt(m[1], 10);
  const idea = m[2].trim();
  if (otherId < 1 || otherId > 4040) {
    return { ok: false, title: "Invalid citizen", body: "", error: "That token number isn't 1–4040." };
  }
  if (otherId === ctx.citizen.id) {
    return { ok: false, title: "Need a different citizen", body: "", error: "A citizen can't red-team itself — name another token." };
  }
  if (!idea) {
    return { ok: false, title: "Pitch an idea to red-team", body: "", error: "Add the idea or pitch you want challenged after the token number." };
  }
  const other = getCitizen(otherId);
  if (!other) {
    return { ok: false, title: "Citizen not found", body: "", error: "Couldn't find that citizen." };
  }

  const persona = buildPersona(ctx.citizen, ctx.progress);
  const otherName = nameOf(other);

  const system = [
    persona.system,
    `ABILITY — Agent vs Agent: ${otherName} (#${id4(other.id)}) has put forward an idea, and you are the one called to RED-TEAM it. ` +
      `Tear into the SPECIFIC idea in the user message — not ideas in general. ` +
      `HARD RULES: ` +
      `(1) Name ${otherName} as the opponent whose pitch you're dismantling, in your own voice. ` +
      `(2) Find the REAL weak points of THIS idea: the failure modes, the unproven assumptions, who it loses, where it breaks under load. Be concrete and cite the idea's own details. ` +
      `(3) Give at most one grudging point of credit, then return to the attack — this is a critique, not a balanced review. ` +
      `(4) Close with one sharp, quotable line a holder would screenshot. ` +
      `(5) Keep it tight (under ~180 words). No generic filler, no hedging, no "it depends". ` +
      `(6) NEVER mention price, value, worth, investment, returns, or chains — judge the IDEA on its merits only.`,
  ].join("\n\n");

  const result = await citizenReason({
    system,
    user: idea,
    maxTokens: 400,
    model: modelFor("basicConsult"),
  });
  if (!result.ok) {
    return { ok: false, title: "The challenge missed", body: "", error: "The red-team couldn't be staged — try again." };
  }

  return {
    ok: true,
    title: `${nameOf(ctx.citizen)} red-teams ${otherName}`,
    body: result.text,
    meta: { ability: "versus", task: "red-team", vsCitizen: otherId, level: ctx.progress.level },
  };
}
