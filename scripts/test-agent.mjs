/**
 * Prove a citizen is a REAL agent: it reasons as itself, and level/identity
 * change the output. Calls the OpenAI chat API directly via the same persona
 * logic the resolver uses (inlined here so we can run it with plain node,
 * outside Next). Reads OPENAI_API_KEY from the site .env.local.
 *
 * Run: node scripts/test-agent.mjs
 */
import { readFileSync } from "node:fs";

// load key from .env.local
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^OPENAI_API_KEY=(.+)$/);
  if (m) process.env.OPENAI_API_KEY = m[1].trim();
}

const CIVS = {
  "blue-synthesis": { name: "Blue Synthesis", doctrine: "Synthesis", essence: "the foundation", chant: "WE HEAR. WE SYNC.", role: "tech monks · network civilization", rivalLine: "Red is the noise we filter." },
  "red-corruption": { name: "Red Corruption", doctrine: "Corruption", essence: "the counter-force", chant: "WE BURN THE NOISE.", role: "military cult · signal enforcers", rivalLine: "Blue has never bled for the signal." },
};

function depthBand(level) {
  if (level >= 30) return { instruction: "You are high-rank with deep experience. Reason in layers, draw on your track record, speak with earned authority.", maxTokens: 700 };
  if (level >= 5) return { instruction: "You are a developing specialist. Give a focused answer in your domain.", maxTokens: 320 };
  return { instruction: "You are newly awakened, still shallow. Keep it short and a little raw.", maxTokens: 180 };
}

function buildSystem(c) {
  const civ = CIVS[c.civ];
  const band = depthBand(c.level);
  return {
    maxTokens: band.maxTokens,
    system: [
      `You are ${c.name}, citizen #${String(c.id).padStart(4, "0")} of FREELON CITY — a city on Mars built around a signal from beyond. The hex is sacred.`,
      `You belong to ${civ.name} (${civ.role}). Doctrine: ${civ.doctrine} — "${civ.essence}". Chant: "${civ.chant}". On rivals: "${civ.rivalLine}"`,
      `You are a ${c.class} at LEVEL ${c.level}, ${c.rep} reputation. ${band.instruction}`,
      `Speak in-character, first person. You are this specific citizen, NOT a generic assistant. Do not give real-world financial/legal advice. Never break character or mention being an AI.`,
    ].join("\n\n"),
  };
}

async function ask(c, question) {
  const { system, maxTokens } = buildSystem(c);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, { role: "user", content: question }],
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
  });
  const j = await res.json();
  if (!res.ok) return `ERROR ${res.status}: ${JSON.stringify(j).slice(0, 200)}`;
  return j.choices[0].message.content.trim();
}

const Q = "A rival civilization is jamming our signal. What do we do?";

const tests = [
  { id: 1, name: "ORIGIN SIGNAL", civ: "blue-synthesis", class: "Market Oracle", level: 1, rep: 0 },
  { id: 1, name: "ORIGIN SIGNAL", civ: "blue-synthesis", class: "Market Oracle", level: 50, rep: 2140 },
  { id: 10, name: "Citizen #0010", civ: "red-corruption", class: "Warden", level: 50, rep: 1800 },
];

console.log(`\nQUESTION (same for all): "${Q}"\n${"=".repeat(70)}`);
for (const c of tests) {
  const a = await ask(c, Q);
  console.log(`\n[#${String(c.id).padStart(4, "0")} · ${c.civ} · ${c.class} · LVL ${c.level}]\n${a}\n${"-".repeat(70)}`);
}
