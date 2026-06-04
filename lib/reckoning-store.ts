/**
 * The Reckoning store — the weekly civ-vs-civ tribute war.
 *
 * Server-authoritative, week-namespaced records (Upstash REST with in-memory
 * fallback, same pattern as lib/tithe-store / lib/city-store):
 *
 *   freelon:reckoning:v1:wk<N>:civ:<slug>   → CivWar       (per civ, per week)
 *   freelon:reckoning:v1:wk<N>:gen:<addr>   → General      (per wallet, per week)
 *   freelon:reckoning:v1:settled            → number        (last settled week)
 *   freelon:reckoning:v1:archive            → ArchiveEntry[] (crowned past weeks)
 *
 * ECONOMY ISOLATION (locked rule): this is an isolated tally. The ONLY hex
 * movement in The Reckoning is a DEBIT (burn) performed by the tribute route —
 * never here, and never a mint. The `rawHex` field below mirrors what was
 * burned for display; this module credits no real hex to anyone.
 */

import {
  RECKONING_VERSION,
  reckoningWeek,
  weekStartTs,
  weekEndTs,
  warPointsMarginal,
} from "@/lib/reckoning-config";
import { CIVILIZATIONS } from "@/lib/constants";
import { upstash, hasUpstash } from "@/lib/upstash-client";

const CIV_SLUGS = Object.keys(CIVILIZATIONS);

export type CivWar = {
  slug: string;
  week: number;
  score: number; // muster-amplified war points
  rawHex: number; // actual hex burned toward this civ
  tributes: number; // count of tribute actions
  updatedTs: number;
};

export type General = {
  address: string;
  week: number;
  score: number; // total war points contributed this week
  rawHex: number; // total hex burned this week
  byCiv: Record<string, number>; // war points per civ this week
  rawByCiv?: Record<string, number>; // raw hex per civ this week (drives the anti-whale curve)
  updatedTs: number;
};

export type ArchiveEntry = {
  week: number;
  winner: string | null; // civ slug, null if the week had no tributes
  winnerName: string | null;
  score: number;
  rawHex: number;
  startedTs: number;
  endedTs: number;
};

export type ReckoningView = {
  week: number;
  weekStartTs: number;
  weekEndTs: number;
  civs: Array<{ slug: string; score: number; rawHex: number; tributes: number }>;
  leader: string | null; // civ slug of the current weekly leader (score > 0)
  totalScore: number;
  totalHex: number;
  archive: ArchiveEntry[];
};

const mem = new Map<string, string>();

const NS = `freelon:reckoning:v${RECKONING_VERSION}`;
const CIV_KEY = (week: number, slug: string) => `${NS}:wk${week}:civ:${slug}`;
const GEN_KEY = (week: number, addr: string) =>
  `${NS}:wk${week}:gen:${addr.toLowerCase()}`;
const SETTLED_KEY = `${NS}:settled`;
const ARCHIVE_KEY = `${NS}:archive`;

async function getJSON<T>(key: string): Promise<T | null> {
  if (!hasUpstash) {
    const raw = mem.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  try {
    const raw = (await upstash(["GET", key])) as string | null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  if (!hasUpstash) {
    mem.set(key, raw);
    return;
  }
  await upstash(["SET", key, raw]);
}

/** Bounded key scan (Upstash SCAN / in-mem prefix match). */
async function scanKeys(pattern: string): Promise<string[]> {
  if (!hasUpstash) {
    const prefix = pattern.replace(/\*$/, "");
    return [...mem.keys()].filter((k) => k.startsWith(prefix));
  }
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    const keys: string[] = [];
    let cursor = "0";
    let pages = 0;
    const startedAt = Date.now();
    do {
      if (Date.now() - startedAt > 4000) break;
      const res = await fetch(
        `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/1000`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (!res.ok) break;
      const j = (await res.json()) as { result: [string, string[]] };
      cursor = j.result[0];
      for (const k of j.result[1]) keys.push(k);
      if (++pages > 10) break;
    } while (cursor !== "0");
    return keys;
  } catch {
    return [];
  }
}

/**
 * Self-heal against the v1→v2 incident (2026-06): RECKONING_VERSION is part of
 * the storage namespace, so bumping it MID-WEEK abandoned the live week's
 * already-burned tributes in the old namespace — real hex gone, standing
 * vanished (see scripts/reckoning-v1-audit.mjs).
 *
 * To make that UNABLE to recur, the first time the live week is touched under a
 * new version we carry its prior-version records forward VERBATIM — scores are
 * copied exactly as they were stored, never re-scored under the new rules — so
 * a future bump can no longer silently drop in-flight burns. Completed weeks
 * are left to settle under their own version; only the in-flight week heals.
 * Idempotent: a per-week marker (and a per-process guard) stop repeat work.
 */
const PRIOR_NS =
  RECKONING_VERSION > 1 ? `freelon:reckoning:v${RECKONING_VERSION - 1}` : null;
const carriedWeeks = new Set<number>();

async function carryForwardInFlight(week: number): Promise<void> {
  if (!PRIOR_NS || carriedWeeks.has(week)) return;
  carriedWeeks.add(week);
  const marker = `${NS}:wk${week}:carried`;
  if (await getJSON<number>(marker)) return; // already healed in a prior process

  const priorWk = `${PRIOR_NS}:wk${week}`;
  // Civ tallies: copy any the new namespace doesn't already have.
  for (const slug of CIV_SLUGS) {
    const prior = await getJSON<CivWar>(`${priorWk}:civ:${slug}`);
    if (!prior || prior.tributes <= 0) continue;
    if (await getJSON<CivWar>(CIV_KEY(week, slug))) continue;
    await setJSON(CIV_KEY(week, slug), prior);
  }
  // General records: same, scanned from the prior namespace.
  for (const k of await scanKeys(`${priorWk}:gen:*`)) {
    const prior = await getJSON<General>(k);
    if (!prior) continue;
    const addr = prior.address.toLowerCase();
    if (await getJSON<General>(GEN_KEY(week, addr))) continue;
    await setJSON(GEN_KEY(week, addr), prior);
  }
  await setJSON(marker, Date.now());
}

// ── reads ──────────────────────────────────────────────────────────────────

async function getCivWar(week: number, slug: string): Promise<CivWar> {
  const v = await getJSON<CivWar>(CIV_KEY(week, slug));
  return (
    v ?? { slug, week, score: 0, rawHex: 0, tributes: 0, updatedTs: 0 }
  );
}

/** All ten civ wars for a week, in canonical slug order. */
async function getWeekCivs(week: number): Promise<CivWar[]> {
  return Promise.all(CIV_SLUGS.map((slug) => getCivWar(week, slug)));
}

async function getArchive(): Promise<ArchiveEntry[]> {
  return (await getJSON<ArchiveEntry[]>(ARCHIVE_KEY)) ?? [];
}

export async function getGeneral(week: number, addr: string): Promise<General> {
  const v = await getJSON<General>(GEN_KEY(week, addr));
  return (
    v ?? {
      address: addr.toLowerCase(),
      week,
      score: 0,
      rawHex: 0,
      byCiv: {},
      rawByCiv: {},
      updatedTs: 0,
    }
  );
}

// ── settlement (lazy, on read) ───────────────────────────────────────────────

/**
 * Crown + archive any fully-elapsed weeks that haven't been settled yet.
 * Runs on read so there is no cron dependency. Bounded so a long-dormant
 * deployment can't loop unboundedly; weeks normally advance one at a time.
 */
async function settleElapsedWeeks(now: number): Promise<void> {
  const current = reckoningWeek(now);
  const lastSettled = (await getJSON<number>(SETTLED_KEY)) ?? 0;
  // Settle every completed week strictly before the current one.
  const from = Math.max(1, lastSettled + 1);
  const to = current - 1;
  if (to < from) return;

  const archive = await getArchive();
  let settledTo = lastSettled;
  let guard = 0;
  for (let wk = from; wk <= to && guard < 12; wk++, guard++) {
    const civs = await getWeekCivs(wk);
    const total = civs.reduce((n, c) => n + c.score, 0);
    if (total > 0) {
      const top = civs.reduce((a, b) => (b.score > a.score ? b : a));
      archive.push({
        week: wk,
        winner: top.slug,
        winnerName:
          (CIVILIZATIONS as Record<string, { name: string }>)[top.slug]?.name ??
          top.slug,
        score: top.score,
        rawHex: top.rawHex,
        startedTs: weekStartTs(wk),
        endedTs: weekEndTs(wk),
      });
    } else {
      archive.push({
        week: wk,
        winner: null,
        winnerName: null,
        score: 0,
        rawHex: 0,
        startedTs: weekStartTs(wk),
        endedTs: weekEndTs(wk),
      });
    }
    settledTo = wk;
  }

  // Keep the most recent ~52 crowned weeks.
  const trimmed = archive.slice(-52);
  await setJSON(ARCHIVE_KEY, trimmed);
  await setJSON(SETTLED_KEY, settledTo);
}

/** Public view: the live week's board + the crowned archive. */
export async function getReckoning(): Promise<ReckoningView> {
  const now = Date.now();
  await settleElapsedWeeks(now);
  const week = reckoningWeek(now);
  await carryForwardInFlight(week);
  const civs = await getWeekCivs(week);
  const totalScore = civs.reduce((n, c) => n + c.score, 0);
  const totalHex = civs.reduce((n, c) => n + c.rawHex, 0);
  const top = civs.reduce(
    (a, b) => (b.score > a.score ? b : a),
    civs[0] ?? { score: 0, slug: "" as string },
  );
  const leader = totalScore > 0 ? top.slug : null;
  const archive = (await getArchive()).slice().reverse(); // newest first
  return {
    week,
    weekStartTs: weekStartTs(week),
    weekEndTs: weekEndTs(week),
    civs: civs.map((c) => ({
      slug: c.slug,
      score: c.score,
      rawHex: c.rawHex,
      tributes: c.tributes,
    })),
    leader,
    totalScore,
    totalHex,
    archive,
  };
}

// ── write: record a tribute (the burn happens in the route) ──────────────────

/**
 * Record one tribute into the current week. `rawHex` is what the route already
 * burned; `heldOfCiv` is the burner's held citizens of the civ (for muster).
 * War points are computed HERE via the anti-whale curve, keyed on the wallet's
 * cumulative raw hex to this civ this week (so splitting a big burn can't dodge
 * the damping). Both the civ tally and the per-wallet general record are bumped.
 * Returns the live week, updated civ + general, and the points awarded.
 *
 * Read-modify-write (non-atomic, same as tithe/city stores) — acceptable at
 * this scale and consistent with the rest of the codebase.
 */
export async function recordTribute(input: {
  address: string;
  civ: string;
  rawHex: number;
  heldOfCiv: number;
}): Promise<{ week: number; civ: CivWar; general: General; points: number }> {
  const now = Date.now();
  const week = reckoningWeek(now);
  const slug = input.civ.toLowerCase();
  const addr = input.address.toLowerCase();

  await carryForwardInFlight(week);
  const gen = await getGeneral(week, addr);
  const prevRawToCiv = (gen.rawByCiv?.[slug] ?? 0);
  const points = warPointsMarginal(prevRawToCiv, input.rawHex, input.heldOfCiv);

  const civ = await getCivWar(week, slug);
  civ.score += points;
  civ.rawHex += input.rawHex;
  civ.tributes += 1;
  civ.updatedTs = now;
  await setJSON(CIV_KEY(week, slug), civ);

  gen.score += points;
  gen.rawHex += input.rawHex;
  gen.byCiv[slug] = (gen.byCiv[slug] || 0) + points;
  gen.rawByCiv = { ...(gen.rawByCiv ?? {}), [slug]: prevRawToCiv + input.rawHex };
  gen.updatedTs = now;
  await setJSON(GEN_KEY(week, addr), gen);

  return { week, civ, general: gen, points };
}

// ── leaderboard: top generals this week ──────────────────────────────────────

/** Top contributing wallets ("generals") for a week. SCAN+MGET bounded scan,
 *  same pattern as lib/city-store#listTopContributors. */
export async function listGenerals(
  week: number,
  limit = 20,
): Promise<Array<{ address: string; score: number; rawHex: number; topCiv: string | null }>> {
  let records: General[] = [];
  if (!hasUpstash) {
    const prefix = `${NS}:wk${week}:gen:`;
    for (const [k, raw] of mem) {
      if (k.startsWith(prefix)) {
        try {
          records.push(JSON.parse(raw) as General);
        } catch {}
      }
    }
  } else {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL!;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
      const pattern = `${NS}:wk${week}:gen:*`;
      const keys: string[] = [];
      let cursor = "0";
      let pages = 0;
      const startedAt = Date.now();
      do {
        if (Date.now() - startedAt > 5000) break;
        const res = await fetch(
          `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/1000`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        if (!res.ok) break;
        const j = (await res.json()) as { result: [string, string[]] };
        cursor = j.result[0];
        for (const k of j.result[1]) keys.push(k);
        pages++;
        if (keys.length >= 500 || pages > 10) break;
      } while (cursor !== "0");

      if (keys.length) {
        const mr = await fetch(
          `${url}/MGET/${keys.map((k) => encodeURIComponent(k)).join("/")}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        if (mr.ok) {
          const mj = (await mr.json()) as { result: (string | null)[] };
          for (const raw of mj.result) {
            if (!raw) continue;
            try {
              records.push(JSON.parse(raw) as General);
            } catch {}
          }
        }
      }
    } catch {
      records = [];
    }
  }

  return records
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => {
      let topCiv: string | null = null;
      let best = -1;
      for (const [slug, pts] of Object.entries(r.byCiv || {})) {
        if (pts > best) {
          best = pts;
          topCiv = slug;
        }
      }
      return { address: r.address, score: r.score, rawHex: r.rawHex, topCiv };
    });
}
