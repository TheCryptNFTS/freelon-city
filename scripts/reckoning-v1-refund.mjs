/**
 * Make-whole refund for tributes orphaned by the Reckoning v1→v2 reset.
 *
 * The v2 version bump abandoned the v1 namespace mid-week. One wallet had
 * already BURNED real hex into the in-flight (never-settled) week 1 war, so the
 * hex left their balance with nothing to show. This refunds that burned hex.
 *
 * Decision (founder-approved): refund the burned hex (the thing of value),
 * NOT re-inject the war score — the v2 season already started and re-scoring
 * mid-season is exactly what the bump set out to avoid.
 *
 * SAFE BY DEFAULT: dry-run unless you pass --execute. Idempotent — it stamps a
 * repair event and deletes the orphaned v1 keys, so a second --execute run will
 * not double-credit.
 *
 * Dry-run : set -a && . ./.env.local && set +a && node scripts/reckoning-v1-refund.mjs
 * Execute : set -a && . ./.env.local && set +a && node scripts/reckoning-v1-refund.mjs --execute
 */

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!URL || !TOKEN) {
  console.error("Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.");
  process.exit(1);
}
const EXECUTE = process.argv.includes("--execute");
const H = { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" };
const REPAIR_NOTE = "Reckoning v1→v2 reset repair — refund of orphaned tribute";

async function cmd(parts) {
  const path = parts.map((p) => encodeURIComponent(String(p))).join("/");
  const r = await fetch(`${URL}/${path}`, H);
  if (!r.ok) throw new Error(`${parts[0]} failed: ${r.status}`);
  return (await r.json()).result;
}
async function setJSON(key, value) {
  const r = await fetch(`${URL}/SET/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(value),
  });
  if (!r.ok) throw new Error(`SET failed: ${r.status}`);
}
async function scan(pattern) {
  const keys = [];
  let cursor = "0";
  do {
    const res = await fetch(
      `${URL}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/1000`,
      H,
    );
    if (!res.ok) throw new Error(`SCAN failed: ${res.status}`);
    const j = await res.json();
    cursor = j.result[0];
    for (const k of j.result[1]) keys.push(k);
  } while (cursor !== "0");
  return keys;
}
const parse = (raw) => {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

(async () => {
  console.log(`\n=== Reckoning v1→v2 refund  [${EXECUTE ? "EXECUTE" : "DRY-RUN"}] ===\n`);

  // Find orphaned, NEVER-SETTLED v1 generals (settled weeks were legit wars).
  const archive = parse(await cmd(["GET", "freelon:reckoning:v1:archive"])) || [];
  const crowned = new Set(archive.map((a) => a.week));
  const genKeys = await scan("freelon:reckoning:v1:wk*:gen:*");

  const refunds = [];
  for (const gk of genKeys) {
    const g = parse(await cmd(["GET", gk]));
    if (!g || !g.rawHex) continue;
    if (crowned.has(g.week)) {
      console.log(`skip ${g.address} wk${g.week} — week was crowned (legit war), no refund`);
      continue;
    }
    refunds.push(g);
  }

  if (!refunds.length) {
    console.log("Nothing to refund.\n");
    return;
  }

  for (const g of refunds) {
    const addr = g.address.toLowerCase();
    const hexKey = `freelon:walletHex:v1:${addr}`;
    const rec = parse(await cmd(["GET", hexKey])) || {
      address: addr, balance: 0, lifetimeEarned: 0, lastHolderTickDay: null,
      lastEventTs: 0, sweepsToday: 0, sweepsResetDay: new Date().toISOString().slice(0, 10),
      events: [], claimStreak: 0, lastClaimDay: null, lastDefenderTickDay: null,
    };

    const already = (rec.events || []).some((e) => e.note === REPAIR_NOTE);
    if (already) {
      console.log(`ALREADY REPAIRED ${addr} (+${g.rawHex}) — skipping (idempotent)`);
      continue;
    }

    console.log(`REFUND ${addr}: balance ${rec.balance} → ${rec.balance + g.rawHex}  (+${g.rawHex} hex)`);

    if (EXECUTE) {
      const ts = Date.now();
      rec.balance += g.rawHex; // restore burned hex; lifetimeEarned untouched (a reversal, not an earning)
      rec.events = [{ ts, kind: "manual", amount: g.rawHex, note: REPAIR_NOTE }, ...(rec.events || [])].slice(0, 50);
      rec.lastEventTs = Math.max(rec.lastEventTs || 0, ts);
      await setJSON(hexKey, rec);

      // Delete the orphaned v1 records for this week so they can't be re-processed.
      const gk = `freelon:reckoning:v1:wk${g.week}:gen:${addr}`;
      await cmd(["DEL", gk]);
      for (const ck of await scan(`freelon:reckoning:v1:wk${g.week}:civ:*`)) {
        await cmd(["DEL", ck]);
      }
      console.log(`  done — credited & orphaned v1 wk${g.week} keys deleted`);
    }
  }

  console.log(EXECUTE ? "\nRefund complete.\n" : "\nDRY-RUN only — re-run with --execute to apply.\n");
})().catch((e) => {
  console.error("REFUND FAILED:", e.message);
  process.exit(1);
});
