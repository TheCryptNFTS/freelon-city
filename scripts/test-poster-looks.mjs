/**
 * Verify the NEW poster looks generate well via the REAL OpenRouter path.
 * Mirrors lib/missions/image-gen.ts exactly: same buildImagePrompt, same
 * OpenRouter chat/completions image call, real IPFS reference art.
 *
 * Real paid generation (user-authorized). Writes PNGs to public/generated/looktest/.
 * Run: node scripts/test-poster-looks.mjs [scene1 scene2 ...]
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// load OPENROUTER_API_KEY from .env / .env.local
for (const f of [".env", ".env.local"]) {
  try {
    for (const line of (await readFile(new URL(`../${f}`, import.meta.url), "utf8")).split("\n")) {
      const m = line.match(/^OPENROUTER_API_KEY=(.+)$/);
      if (m) process.env.OPENROUTER_API_KEY = m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) { console.error("no OPENROUTER_API_KEY"); process.exit(1); }

const MODEL = process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image";
const IMAGE_CID = "bafybeifax6nksc7h7m3duztjbrpy3e4bnyz3k3nj6xqcdleqsnpod622vi";
const refUrl = (id) => `https://gateway.pinata.cloud/ipfs/${IMAGE_CID}/${String(id).padStart(4,"0")}.jpg`;

// the NEW looks (copied from SCENES in image-gen.ts)
const LOOKS = {
  "rain-neon-district": "on a rain-slick neon megacity street at night, reflections in wet stone, volumetric haze, distant signage glow raking across the figure, cinematic Blade Runner mood",
  "eclipse-ring": "silhouetted in the burning gold corona of a total black-sun eclipse over a dead city skyline, awe and dread, rim-lit edges",
  "aurora-wastes": "alone on a cracked salt-flat under a vast aurora of gold and violet signal-light, cosmic loneliness, lone monumental figure, distant ruins",
};

const id4 = (n) => String(n).padStart(4,"0");
// IDENTICAL to lib/missions/image-gen.ts buildImagePrompt (untrained line omitted; #1450 is trained)
function prompt(c, sceneDesc) {
  return [
    "Keep the figure in the reference image EXACTLY: its faceted sculptural head/helm, the glowing",
    "geometric HEX symbol where a face would be, its robes, its exact colour palette and materials.",
    "Do NOT add a human face, eyes, hair, or turn it into a person or cartoon. Same character, same silhouette.",
    `This is FREELON CITY citizen #${id4(c.id)} (${c.civilization}, ${c.tier}).`,
    `Only change the SETTING to a cinematic scene: ${sceneDesc}.`,
    "Premium dark cinematic render, dramatic volumetric light, the hex glowing as a key light source.",
    "Collector-grade, readable at thumbnail size.",
  ].join(" ");
}

async function gen(c, key) {
  const refRes = await fetch(refUrl(c.id));
  if (!refRes.ok) return { ok:false, error:`ref ${refRes.status}` };
  const refB64 = Buffer.from(await refRes.arrayBuffer()).toString("base64");
  const content = [
    { type:"text", text: prompt(c, LOOKS[key]) },
    { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${refB64}` } },
  ];
  const t0 = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:"POST",
    headers:{ Authorization:`Bearer ${KEY}`, "Content-Type":"application/json", "HTTP-Referer":"https://www.freeloncity.com", "X-Title":"FREELON CITY" },
    body: JSON.stringify({ model: MODEL, modalities:["image","text"], messages:[{ role:"user", content }], stream:false }),
  });
  const ms = Date.now()-t0;
  if (!res.ok) return { ok:false, error:`or_${res.status}:${(await res.text()).slice(0,160)}`, ms };
  const j = await res.json();
  const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
  const b64 = url.startsWith("data:") ? url.slice(url.indexOf(",")+1) : "";
  if (!b64) return { ok:false, error:`empty_image: ${JSON.stringify(j).slice(0,160)}`, ms };
  return { ok:true, b64, ms };
}

const OUT = path.resolve(process.cwd(), "public/generated/looktest");
await mkdir(OUT, { recursive:true });
const citizen = { id:1450, civilization:"red-corruption", tier:"Uncommon" };
const keys = process.argv.slice(2).length ? process.argv.slice(2) : ["rain-neon-district","eclipse-ring"];
console.log(`model=${MODEL}  citizen=#${citizen.id}  looks=${keys.join(",")}`);
for (const key of keys) {
  process.stdout.write(`  ${key} ... `);
  const r = await gen(citizen, key);
  if (!r.ok) { console.log(`FAIL (${r.ms||0}ms) ${r.error}`); continue; }
  const file = path.join(OUT, `${id4(citizen.id)}-${key}.png`);
  await writeFile(file, Buffer.from(r.b64, "base64"));
  console.log(`OK ${r.ms}ms -> ${path.relative(process.cwd(), file)}`);
}
