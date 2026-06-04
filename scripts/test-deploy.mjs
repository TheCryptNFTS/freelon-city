/**
 * Exercise the IN-APP "Deploy Citizen" resolver path end-to-end (no Next, no
 * payment): builds the same persona/spec the app uses, calls the real image-gen
 * client against real shipped art, writes to public/generated/deploy/.
 *
 * Inlines the image-gen call (the lib is TS) but uses the IDENTICAL prompt +
 * reference + endpoint the resolver uses, so it proves the app path works.
 * Run: node scripts/test-deploy.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

for (const line of (await readFile(new URL("../.env.local", import.meta.url), "utf8")).split("\n")) {
  const m = line.match(/^OPENAI_API_KEY=(.+)$/);
  if (m) process.env.OPENAI_API_KEY = m[1].trim();
}

const SHIP = path.resolve(process.cwd(), "../ship/images_jpg");
const OUT = path.resolve(process.cwd(), "public/generated/deploy");
const citizens = JSON.parse(await readFile(path.resolve(process.cwd(), "data/citizens.json"), "utf8"));
const byId = Object.fromEntries(citizens.map((c) => [c.id, c]));

const SCENES = {
  "neon-city": "standing atop a rain-slick neon spire overlooking the Mars city at night, volumetric city light below",
  "signal-fire": "before a towering wall of signal-fire in a war hall, embers and sparks drifting through the dark",
  "throne-room": "seated on a throne dais under dramatic shafts of light, regal and still, the hall fading into shadow",
};

function id4(n) { return String(n).padStart(4, "0"); }

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

async function deploy(cid, sceneKey) {
  const c = byId[cid];
  const ref = await readFile(path.join(SHIP, `${id4(cid)}.jpg`));
  const form = new FormData();
  form.append("model", "gpt-image-1.5");
  form.append("prompt", prompt(c, SCENES[sceneKey]));
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("image", new Blob([ref], { type: "image/jpeg" }), `${id4(cid)}.jpg`);
  const t0 = Date.now();
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const j = await res.json();
  if (!res.ok) return { ok: false, error: `${res.status}: ${JSON.stringify(j).slice(0, 160)}` };
  await mkdir(OUT, { recursive: true });
  const filename = `${id4(cid)}-${sceneKey}-${Date.now()}.png`;
  await writeFile(path.join(OUT, filename), Buffer.from(j.data[0].b64_json, "base64"));
  return { ok: true, url: `/generated/deploy/${filename}`, secs: Math.round((Date.now() - t0) / 1000) };
}

const jobs = [
  [1, "neon-city"],
  [10, "signal-fire"],
  [20, "throne-room"],
];
console.log("In-app Deploy resolver path — 3 citizens off real shipped art:\n");
for (const [cid, scene] of jobs) {
  const r = await deploy(cid, scene);
  console.log(r.ok
    ? `  #${id4(cid)} ${byId[cid].civilization.padEnd(16)} ${scene.padEnd(12)} ${r.secs}s ok → public${r.url}`
    : `  #${id4(cid)} FAIL ${r.error}`);
}
console.log("\nView under public/generated/deploy/ — served at /generated/deploy/<file> by the app.");
