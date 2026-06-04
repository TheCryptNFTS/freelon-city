/**
 * CITIZEN FEUD / COLLAB resolver ($6, viral) — two citizens, one output.
 *
 * The holder names a SECOND citizen by token id; this agent and that one
 * co-produce a short piece: a rivalry exchange, a duet, a heist plan, a debate —
 * written in BOTH citizens' voices/civilizations. Every output advertises two
 * NFTs and pulls another holder into the loop. Social by construction.
 *
 * Input format: "<otherTokenId> [optional theme]"  e.g. "404 a heist on the Throne"
 */
import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { citizenReason } from "@/lib/missions/llm";
import { modelFor } from "@/lib/missions/models";
import { getCitizen } from "@/lib/citizens";
import { deriveSpec } from "@/lib/specialization";
import { getProgress } from "@/lib/progression-store";
import { CIVILIZATIONS } from "@/lib/constants";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}
function civLine(slug: string): string {
  const c = (CIVILIZATIONS as Record<string, { name: string; doctrine: string; chant: string }>)[slug];
  return c ? `${c.name} (${c.doctrine}, "${c.chant}")` : slug;
}
function nameOf(c: { id: number; transmission_name: string; honoree: string }): string {
  return c.transmission_name || c.honoree || `Citizen #${id4(c.id)}`;
}

export async function feudResolver(ctx: MissionContext): Promise<MissionOutput> {
  const raw = ctx.input.trim();
  const m = raw.match(/^#?(\d{1,4})\b\s*(.*)$/);
  if (!m) {
    return { ok: false, title: "Name a second citizen", body: "", error: "Start with the other citizen's token number (1–4040), e.g. \"404 a heist on the Throne\"." };
  }
  const otherId = parseInt(m[1], 10);
  const theme = m[2].trim();
  if (otherId < 1 || otherId > 4040) {
    return { ok: false, title: "Invalid citizen", body: "", error: "That token number isn't 1–4040." };
  }
  if (otherId === ctx.citizen.id) {
    return { ok: false, title: "Need a different citizen", body: "", error: "A citizen can't feud with itself — name another token." };
  }
  const other = getCitizen(otherId);
  if (!other) {
    return { ok: false, title: "Citizen not found", body: "", error: "Couldn't find that citizen." };
  }

  const otherProg = await getProgress(otherId).catch(() => null);
  const meSpec = deriveSpec(ctx.progress);
  const otherSpec = otherProg ? deriveSpec(otherProg) : null;

  const system = [
    `You are the narrator of a FREELON CITY encounter between TWO citizens. Write a short, vivid, shareable piece (a rivalry exchange, duet, heist, or debate — pick what fits the theme) in BOTH their voices.`,
    `CITIZEN A — ${nameOf(ctx.citizen)} (#${id4(ctx.citizen.id)}), of ${civLine(ctx.citizen.civilization)}${meSpec.cls !== "drifter" ? `, a ${meSpec.className}` : ""}.`,
    `CITIZEN B — ${nameOf(other)} (#${id4(other.id)}), of ${civLine(other.civilization)}${otherSpec && otherSpec.cls !== "drifter" ? `, a ${otherSpec.className}` : ""}.`,
    `Keep it punchy and quotable (under ~180 words). Give each citizen a distinct voice shaped by their civilization. End with a one-line "the city remembers" beat. Stay in-world; no real-world advice.`,
  ].join("\n\n");

  const user = theme || "Stage their encounter — let their civilizations' rivalry set the tone.";
  const result = await citizenReason({ system, user, maxTokens: 400, model: modelFor("basicConsult") });
  if (!result.ok) {
    return { ok: false, title: "The signal crossed", body: "", error: "The encounter couldn't be staged — try again." };
  }

  return {
    ok: true,
    title: `${nameOf(ctx.citizen)} × ${nameOf(other)}`,
    body: result.text,
    meta: { ability: "feud", task: "encounter", withCitizen: otherId, focus: theme ? undefined : "feud", level: ctx.progress.level },
  };
}
