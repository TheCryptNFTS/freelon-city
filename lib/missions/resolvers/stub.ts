/**
 * STUB resolvers — no LLM wired yet.
 *
 * These prove the full sink pipeline end-to-end (burn ⬡ → resolve → output +
 * XP) with deterministic, templated output. When we pick the mission(s) worth
 * paying for, the real implementation swaps in behind the SAME resolve()
 * signature — the endpoint, registry, UI, and telemetry do not change.
 *
 * Each resolver speaks AS the citizen (persistent character: id, civilization,
 * skills, reputation), not as a generic assistant — that's the product wedge.
 */

import type { MissionContext, MissionOutput } from "@/lib/missions/types";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

function persona(ctx: MissionContext): string {
  const c = ctx.citizen;
  const name = c.transmission_name || c.honoree || `Citizen #${id4(c.id)}`;
  return `${name} · ${c.civilization.replace("-", " ").toUpperCase()} · LVL ${ctx.progress.level}`;
}

/**
 * Consultancy ("ai" kind, stub). The citizen answers a question in-character.
 * Real version: LLM call seeded with the citizen's identity + skill level.
 */
export async function consultStub(ctx: MissionContext): Promise<MissionOutput> {
  const q = ctx.input.trim();
  if (!q) return { ok: false, title: "No question", body: "", error: "Ask the citizen something." };
  const c = ctx.citizen;
  const body =
    `[${persona(ctx)} responds]\n\n` +
    `You asked: "${q}"\n\n` +
    `As a ${c.sub_archetype || "signal-born"} of ${c.civilization.replace("-", " ")}, ` +
    `my read is shaped by ${ctx.progress.skills.research} points of research and ` +
    `${ctx.progress.reputation} reputation earned in the city.\n\n` +
    `— This is a STUB response. The real consultancy wires an LLM seeded with ` +
    `this citizen's identity, history, and skill level, so a Level 100 citizen ` +
    `answers with more depth than a Level 1.`;
  return { ok: true, title: `Consult · ${persona(ctx)}`, body, meta: { stub: true, question: q } };
}

/**
 * Transmission ("content" kind, stub). Generates a shareable lore fragment
 * from the citizen's own traits — every output is a marketing asset.
 */
export async function transmissionStub(ctx: MissionContext): Promise<MissionOutput> {
  const c = ctx.citizen;
  const body =
    `⬡ TRANSMISSION · ${id4(c.id)}\n\n` +
    `In the ${c.hex_state.toLowerCase()}, ${c.transmission_name || `Citizen #${id4(c.id)}`} ` +
    `broadcasts on the ${c.signal_type.toLowerCase()}. Caste: ${c.caste}. Glow: ${c.glow_level}.\n\n` +
    `The city remembers this signal. (STUB — real version generates a unique ` +
    `transmission from the citizen's full trait set + creativity level.)`;
  return { ok: true, title: `Transmission · #${id4(c.id)}`, body, meta: { stub: true } };
}

/**
 * Scout report ("data" kind, stub). Will compute over live on-site data
 * (floor, rarity rank, civ standing). Stubbed to a templated summary for now.
 */
export async function scoutStub(ctx: MissionContext): Promise<MissionOutput> {
  const c = ctx.citizen;
  const body =
    `SCOUT REPORT · #${id4(c.id)}\n\n` +
    `Civilization: ${c.civilization.replace("-", " ")}\n` +
    `Shape: ${c.shape} · Tier: ${c.tier}\n\n` +
    `(STUB — real scout pulls live floor, rarity rank, and civ standing into a ` +
    `one-page brief. No advice, just intelligence.)`;
  return { ok: true, title: `Scout · #${id4(c.id)}`, body, meta: { stub: true } };
}
