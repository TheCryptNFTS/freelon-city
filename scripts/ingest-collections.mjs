/**
 * Ingest OpenSea metadata for the non-Freelon collections into local JSON
 * so each one can have an on-site trait explorer like /citizens (which is
 * powered by data/citizens.json). The Freelons data is authored locally;
 * these collections live on OpenSea, so we pull their full token + trait
 * set once and cache it under data/collections/<slug>.json.
 *
 * Run:  set -a && . ./.env.local && set +a && node scripts/ingest-collections.mjs
 * Re-run to refresh. Needs OPENSEA_API_KEY in the environment.
 *
 * Output shape per file (compact, client-shippable):
 *   { slug, name, chain, contract, total, fetched,
 *     tokens: [{ id, name, img, traits: { TraitType: Value, ... } }] }
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "collections");

const KEY = process.env.OPENSEA_API_KEY;
if (!KEY) {
  console.error("Missing OPENSEA_API_KEY. Run: set -a && . ./.env.local && set +a && node scripts/ingest-collections.mjs");
  process.exit(1);
}

const COLLECTIONS = [
  "the-crypt-official",
  "crypttradingcards",
  "oogies",
  "emile0x1908",
  "smiles-genesis",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, { headers: { "x-api-key": KEY, accept: "application/json" } });
    if (r.status === 429) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
    return r.json();
  }
  throw new Error(`Rate-limited repeatedly for ${url}`);
}

async function ingest(slug) {
  const info = await getJson(`https://api.opensea.io/api/v2/collections/${slug}`);
  const contract = info.contracts?.[0] || {};
  const tokens = [];
  let cursor = "";
  let pages = 0;
  do {
    const url = `https://api.opensea.io/api/v2/collection/${slug}/nfts?limit=200${cursor ? `&next=${cursor}` : ""}`;
    const data = await getJson(url);
    for (const n of data.nfts || []) {
      // Skip disabled / placeholder tokens with no image.
      const img = n.display_image_url || n.image_url || "";
      const traits = {};
      for (const t of n.traits || []) {
        if (t.trait_type == null) continue;
        traits[String(t.trait_type)] = t.value == null ? "" : String(t.value);
      }
      tokens.push({ id: n.identifier, name: n.name || `${info.name} #${n.identifier}`, img, traits });
    }
    cursor = data.next || "";
    pages++;
    if (pages % 5 === 0) process.stdout.write(`  ${slug}: ${tokens.length} tokens…\n`);
    await sleep(220); // stay well under OpenSea rate limits
  } while (cursor);

  // Sort numerically by id where possible for a stable, browsable order.
  tokens.sort((a, b) => {
    const na = Number(a.id), nb = Number(b.id);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a.id).localeCompare(String(b.id));
  });

  const out = {
    slug,
    name: info.name || slug,
    chain: contract.chain || "ethereum",
    contract: contract.address || "",
    total: tokens.length,
    fetched: new Date().toISOString(),
    tokens,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify(out));
  console.log(`✓ ${slug}: ${tokens.length} tokens → data/collections/${slug}.json`);
}

for (const slug of COLLECTIONS) {
  console.log(`Ingesting ${slug}…`);
  try {
    await ingest(slug);
  } catch (e) {
    console.error(`✗ ${slug} failed:`, e.message);
  }
}
console.log("Done.");
