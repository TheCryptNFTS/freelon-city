// One-off original-image generator via OpenRouter (google/gemini-2.5-flash-image).
// Usage: node scripts/gen-image.mjs "<prompt>" <out.png>
// Saves raw PNG; caller optimises to webp separately. Original art only — no IP.
import { readFileSync, writeFileSync } from "fs";

const [, , prompt, out] = process.argv;
if (!prompt || !out) {
  console.error('usage: node scripts/gen-image.mjs "<prompt>" <out.png>');
  process.exit(1);
}
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = (env.match(/^OPENROUTER_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!key) { console.error("no OPENROUTER_API_KEY"); process.exit(1); }

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-image",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  }),
});
const data = await res.json();
if (data.error) { console.error("ERR", JSON.stringify(data.error)); process.exit(1); }
const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
if (!url.startsWith("data:image")) {
  console.error("no image; content:", (data.choices?.[0]?.message?.content || "").slice(0, 200));
  process.exit(1);
}
const buf = Buffer.from(url.split(",")[1], "base64");
writeFileSync(out, buf);
console.log("wrote", out, buf.length, "bytes");
