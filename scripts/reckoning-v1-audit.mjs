/**
 * READ-ONLY audit of the orphaned Reckoning v1 namespace.
 *
 * Background: RECKONING_VERSION was bumped 1→2 (commit 7ec2d82) to open a fresh
 * anti-whale season. The store namespace is `freelon:reckoning:v${VERSION}:...`,
 * so the bump abandoned every `v1:*` key — including any IN-FLIGHT week whose
 * tributes had already DEBITED real hex (the burn is logged in walletHex, but
 * the war standing now reads the empty v2 namespace). Players who burned right
 * before the bump (Bryogus / Blues) lost their standing with hex gone.
 *
 * This script ONLY READS. It enumerates the orphaned v1 generals + civ tallies
 * so we can decide who to make whole, and by how much, before any write.
 *
 * Run: set -a && . ./.env.local && set +a && node scripts/reckoning-v1-audit.mjs
 */

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!URL || !TOKEN) {
  console.error("Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.");
  console.error("Run: set -a && . ./.env.local && set +a && node scripts/reckoning-v1-audit.mjs");
  process.exit(1);
}

const H = { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" };

async function scan(pattern) {
  const keys = [];
  let cursor = "0";
  let pages = 0;
  do {
    const res = await fetch(
      `${URL}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/1000`,
      H,
    );
    if (!res.ok) throw new Error(`SCAN failed: ${res.status}`);
    const j = await res.json();
    cursor = j.result[0];
    for (const k of j.result[1]) keys.push(k);
    if (++pages > 50) break;
  } while (cursor !== "0");
  return keys;
}

async function mget(keys) {
  if (!keys.length) return [];
  const url = `${URL}/MGET/${keys.map((k) => encodeURIComponent(k)).join("/")}`;
  const r = await fetch(url, H);
  if (!r.ok) throw new Error(`MGET failed: ${r.status}`);
  const j = await r.json();
  return j.result;
}

function parse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

(async () => {
  // ── orphaned v1 generals (per wallet, per week) ──────────────────────────
  const genKeys = await scan("freelon:reckoning:v1:wk*:gen:*");
  const genRaw = await mget(genKeys);
  const generals = genRaw.map(parse).filter(Boolean);

  // ── orphaned v1 civ tallies (per civ, per week) ──────────────────────────
  const civKeys = await scan("freelon:reckoning:v1:wk*:civ:*");
  const civRaw = await mget(civKeys);
  const civs = civRaw.map(parse).filter(Boolean);

  // ── v1 archive (which weeks were already crowned/settled under v1) ───────
  const archiveRaw = await mget(["freelon:reckoning:v1:archive"]);
  const archive = parse(archiveRaw[0]) || [];
  const settledRaw = await mget(["freelon:reckoning:v1:settled"]);
  const settled = parse(settledRaw[0]);

  // Group generals by week.
  const byWeek = new Map();
  for (const g of generals) {
    if (!byWeek.has(g.week)) byWeek.set(g.week, []);
    byWeek.get(g.week).push(g);
  }

  console.log("\n========== RECKONING v1 ORPHAN AUDIT (read-only) ==========\n");
  console.log(`v1 generals found : ${generals.length}`);
  console.log(`v1 civ tallies    : ${civs.length}`);
  console.log(`v1 settled-to week: ${settled ?? "(none)"}`);
  console.log(`v1 archived weeks : ${archive.length}\n`);

  for (const wk of [...byWeek.keys()].sort((a, b) => a - b)) {
    const gens = byWeek.get(wk).sort((a, b) => b.rawHex - a.rawHex);
    const wasCrowned = archive.some((a) => a.week === wk);
    const totalRaw = gens.reduce((n, g) => n + (g.rawHex || 0), 0);
    console.log(`── WEEK ${wk}  ${wasCrowned ? "[CROWNED/SETTLED under v1 — a completed war]" : "[NOT settled — in-flight when wiped]"}`);
    console.log(`   wallets: ${gens.length}   total raw hex burned: ${totalRaw}`);
    for (const g of gens) {
      const civList = Object.entries(g.byCiv || {})
        .map(([s, p]) => `${s}:${p}pts`)
        .join(", ");
      console.log(`     ${g.address}  rawHex=${g.rawHex}  score=${g.score}  (${civList})`);
    }
    console.log("");
  }

  if (generals.length === 0) {
    console.log("No orphaned v1 generals found. Either the data already expired,");
    console.log("or no tributes were burned under v1. Nothing to repair.\n");
  }

  console.log("REPAIR GUIDANCE:");
  console.log(" - CROWNED weeks were legitimate, fully-played wars (hex burned by");
  console.log("   design, winner crowned). Do NOT refund these.");
  console.log(" - NOT-settled week = the war that was wiped mid-flight by the v2 bump.");
  console.log("   Those wallets' rawHex is the make-whole refund amount.\n");
})().catch((e) => {
  console.error("AUDIT FAILED:", e.message);
  process.exit(1);
});
