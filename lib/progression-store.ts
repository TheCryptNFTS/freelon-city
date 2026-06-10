/**
 * Per-CITIZEN progression ledger. Distinct from the per-wallet hex ledger
 * (lib/wallet-hex-store.ts): progression lives on the citizen (tokenId), so it
 * is PUBLIC (anyone can view a citizen's level/skills/reputation/memory) and
 * SURVIVES a sale — the citizen is the RPG entity, ownership changes but the
 * history stays. The ⬡ reward for working a job lands on the ACTING wallet's
 * hex ledger; that crediting happens in the route, not here, so this stays a
 * pure citizen-state mutation.
 *
 * Storage mirrors lib/quests-store.ts: GET/SET a JSON blob per key, in-memory
 * Map fallback in dev, and a 3s advisory lock around the read-modify-write to
 * stop concurrent job completions clobbering each other.
 *
 * Leaderboards use Redis SORTED SETS (ZADD on each completion, ZREVRANGE to
 * read) — NOT a SCAN over all 4040 keys. A SCAN copy would silently truncate
 * to ~500 keys and rank an arbitrary subset, producing a WRONG leaderboard.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";
import { ECONOMY } from "@/lib/economy-constants";

// 2026-06-03 — skills reworked to PRACTICAL, money-making names a normal person
// understands (founder + expert panel). FREELONS are owned AI WORKERS; the
// skills are the kinds of work they do for the holder.
export type SkillKey =
  | "content"
  | "strategy"
  | "sales"
  | "research"
  | "design"
  | "risk";

export const SKILL_KEYS: readonly SkillKey[] = [
  "content",
  "strategy",
  "sales",
  "research",
  "design",
  "risk",
] as const;

export type MemoryEntry = {
  type: "job" | "levelup" | "mission";
  description: string;
  xpChange: number;
  signalChange: number; // ⬡ delta: positive = earned (job), negative = burned (mission)
  timestamp: number;
};

export type CitizenProgress = {
  tokenId: number;
  xp: number;
  level: number;
  reputation: number;
  jobsCompleted: number;
  skills: Record<SkillKey, number>;
  memoryLog: MemoryEntry[]; // newest first, ring buffer capped at MEMORY_CAP
  /** Set ONLY by the founder seed tool — marks this as a hand-seeded "display
   *  model", NOT real holder activity. The résumé/showcase surface this so the
   *  live site stays honest. Optional + absent on every real record (zero
   *  migration). The FIRST real mission run clears it (history is now genuine). */
  demo?: boolean;
};

const MEMORY_CAP = 50;

// DEV-ONLY in-memory fallback (used only when !hasUpstash). Backed by globalThis
// so it's a single shared instance across Next's per-route module bundles in dev
// — otherwise each route segment gets its own Map and writes from one route
// (e.g. a seed endpoint) are invisible to another (e.g. the page render). In
// production hasUpstash is always true, so this Map is never touched.
const memory: Map<number, CitizenProgress> =
  ((globalThis as { __freelonProgressionMem?: Map<number, CitizenProgress> }).__freelonProgressionMem ??=
    new Map<number, CitizenProgress>());

const KEY = (id: number) => `freelon:progress:v1:${id}`;
const LOCK_KEY = (id: number) => `freelon:progress:lock:${id}`;

// Sorted-set leaderboard keys — score = the ranked metric, member = tokenId.
const LB_LEVEL = "freelon:progress:lb:level";
const LB_REP = "freelon:progress:lb:rep";
const LB_JOBS = "freelon:progress:lb:jobs";

function emptySkills(): Record<SkillKey, number> {
  return { content: 0, strategy: 0, sales: 0, research: 0, design: 0, risk: 0 };
}

export function empty(tokenId: number): CitizenProgress {
  return {
    tokenId,
    xp: 0,
    level: 1,
    reputation: 0,
    jobsCompleted: 0,
    skills: emptySkills(),
    memoryLog: [],
  };
}

/** Cumulative XP needed to first reach a given level. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return ECONOMY.JOB_XP_LEVEL_BASE * (level - 1) ** 2;
}

/** Level for a given total XP (inverse of the quadratic curve above). */
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / ECONOMY.JOB_XP_LEVEL_BASE)) + 1;
}

/** XP remaining until the next level, plus progress fraction for the bar. */
export function levelProgress(xp: number): {
  level: number;
  intoLevel: number;
  span: number;
  toNext: number;
  fraction: number;
} {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const span = Math.max(1, ceil - floor);
  const intoLevel = xp - floor;
  return {
    level,
    intoLevel,
    span,
    toNext: Math.max(0, ceil - xp),
    fraction: Math.min(1, intoLevel / span),
  };
}

export async function getProgress(tokenId: number): Promise<CitizenProgress> {
  if (!hasUpstash) return memory.get(tokenId) ?? empty(tokenId);
  try {
    const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
    if (!raw) return empty(tokenId);
    const rec = JSON.parse(raw) as CitizenProgress;
    // Defensive: older/partial records may miss a skill key.
    rec.skills = { ...emptySkills(), ...rec.skills };
    return rec;
  } catch {
    return empty(tokenId);
  }
}

async function setProgress(rec: CitizenProgress): Promise<void> {
  if (!hasUpstash) {
    memory.set(rec.tokenId, rec);
    return;
  }
  await upstash(["SET", KEY(rec.tokenId), JSON.stringify(rec)]);
}

// Advisory mutex per citizen — same shape as quests-store. 3s TTL self-heals.
async function acquireLock(tokenId: number, retries = 5): Promise<boolean> {
  if (!hasUpstash) return true; // single-threaded per process
  for (let i = 0; i < retries; i++) {
    try {
      const res = await upstash(["SET", LOCK_KEY(tokenId), "1", "NX", "EX", "3"]);
      if (res === "OK") return true;
    } catch {
      return false;
    }
    await new Promise((r) => setTimeout(r, 80 + i * 40));
  }
  return false;
}

async function releaseLock(tokenId: number): Promise<void> {
  if (!hasUpstash) return;
  try {
    await upstash(["DEL", LOCK_KEY(tokenId)]);
  } catch {}
}

async function updateLeaderboards(rec: CitizenProgress): Promise<void> {
  if (!hasUpstash) return;
  const member = String(rec.tokenId);
  // Fire the three ZADDs. Non-fatal — a failed leaderboard write must never
  // roll back a citizen's earned progress.
  try {
    await Promise.all([
      upstash(["ZADD", LB_LEVEL, String(rec.level), member]),
      upstash(["ZADD", LB_REP, String(rec.reputation), member]),
      upstash(["ZADD", LB_JOBS, String(rec.jobsCompleted), member]),
    ]);
  } catch {}
}

export type ApplyJobResult = {
  progress: CitizenProgress;
  leveledUp: boolean;
  xpGained: number;
};

/**
 * Apply a completed job to a citizen's progression. Pure citizen-state
 * mutation: adds (civ-boosted) XP, recomputes level, bumps the matching skill
 * and reputation, appends memory entries, and updates the sorted-set
 * leaderboards. Does NOT credit ⬡ — the route credits the acting wallet.
 *
 * `signalReward` is recorded in the memory log only (so a viewer can see what
 * the citizen earned its owner); the actual ledger credit is the route's job.
 */
export async function applyJob(args: {
  tokenId: number;
  jobTitle: string;
  requiredSkill: SkillKey;
  rewardXp: number;
  difficulty: number;
  signalReward: number;
  civSlug: string;
}): Promise<ApplyJobResult> {
  const { tokenId, jobTitle, requiredSkill, rewardXp, difficulty, signalReward, civSlug } = args;

  const gotLock = await acquireLock(tokenId);
  try {
    const rec = await getProgress(tokenId);
    const prevLevel = rec.level;

    const bonus = ECONOMY.CIV_XP_BONUS[civSlug] ?? 1;
    const xpGained = Math.round(rewardXp * bonus);

    rec.xp += xpGained;
    rec.level = levelForXp(rec.xp);
    rec.skills[requiredSkill] = (rec.skills[requiredSkill] ?? 0) + 1;
    rec.reputation += ECONOMY.REP_PER_DIFFICULTY * difficulty;
    rec.jobsCompleted += 1;

    const now = Date.now();
    rec.memoryLog.unshift({
      type: "job",
      description: `Completed "${jobTitle}" · +1 ${requiredSkill}`,
      xpChange: xpGained,
      signalChange: signalReward,
      timestamp: now,
    });

    const leveledUp = rec.level > prevLevel;
    if (leveledUp) {
      rec.memoryLog.unshift({
        type: "levelup",
        description: `Reached Level ${rec.level}`,
        xpChange: 0,
        signalChange: 0,
        timestamp: now + 1, // keep it newest-first above the job entry
      });
    }
    if (rec.memoryLog.length > MEMORY_CAP) rec.memoryLog.length = MEMORY_CAP;

    await setProgress(rec);
    await updateLeaderboards(rec);

    return { progress: rec, leveledUp, xpGained };
  } finally {
    if (gotLock) await releaseLock(tokenId);
  }
}

export type ApplyMissionResult = {
  progress: CitizenProgress;
  leveledUp: boolean;
  xpGained: number;
};

/**
 * Apply a completed MISSION to a citizen's progression. Like applyJob, but the
 * ⬡ flow is a BURN (recorded as a negative signalChange in the memory log) and
 * the memory entry carries the mission's output title. Awards XP (civ-boosted)
 * + a skill point and updates the leaderboards. Does NOT move the ledger — the
 * route debits the wallet (and refunds on failure).
 */
export async function applyMission(args: {
  tokenId: number;
  missionTitle: string;
  outputTitle: string;
  skill: SkillKey;
  rewardXp: number;
  costBurned: number;
  civSlug: string;
  /** Optional subject the mission was about (e.g. "the red signal jam"). Stored
   *  as a parseable [focus:x] tag in the memory log so the citizen's history
   *  shapes future output (deriveTuning + the persona digest both read it).
   *  This is what makes a citizen specialize from WHAT it actually did. */
  focusHint?: string;
  /** Whether this mission advances the citizen's CLASS (its skill point). True
   *  for professional work; false for cosmetic/social missions, which still
   *  grant XP (engagement) but must NOT inflate the résumé class/track-record.
   *  Defaults true so jobs and untagged callers behave as before. */
  countsTowardClass?: boolean;
}): Promise<ApplyMissionResult> {
  const { tokenId, missionTitle, outputTitle, skill, rewardXp, costBurned, civSlug, focusHint } = args;
  const countsTowardClass = args.countsTowardClass ?? true;

  const gotLock = await acquireLock(tokenId);
  try {
    const rec = await getProgress(tokenId);
    const prevLevel = rec.level;

    const bonus = ECONOMY.CIV_XP_BONUS[civSlug] ?? 1;
    const xpGained = Math.round(rewardXp * bonus);

    rec.xp += xpGained;
    rec.level = levelForXp(rec.xp);
    // A real mission ran → the record now has genuine history; drop the demo flag.
    if (rec.demo) delete rec.demo;
    // Only professional work deepens the skill (and thus the class/track-record).
    // Cosmetic/social missions grant XP but never pump the résumé.
    if (countsTowardClass) {
      rec.skills[skill] = (rec.skills[skill] ?? 0) + 1;
    }
    // Missions do not grant reputation (that's the job/civic side); they
    // deepen a skill and burn ⬡ for an output.

    const now = Date.now();
    // Append a parseable [focus:x] tag when the mission had a subject, so the
    // citizen's history accrues a focus it can later specialize on.
    const focusTag = focusHint ? ` [focus:${focusHint.slice(0, 24)}]` : "";
    rec.memoryLog.unshift({
      type: "mission",
      description: `${missionTitle} → ${outputTitle}${focusTag}`,
      xpChange: xpGained,
      signalChange: -costBurned, // burn
      timestamp: now,
    });

    const leveledUp = rec.level > prevLevel;
    if (leveledUp) {
      rec.memoryLog.unshift({
        type: "levelup",
        description: `Reached Level ${rec.level}`,
        xpChange: 0,
        signalChange: 0,
        timestamp: now + 1,
      });
    }
    if (rec.memoryLog.length > MEMORY_CAP) rec.memoryLog.length = MEMORY_CAP;

    await setProgress(rec);
    await updateLeaderboards(rec);

    return { progress: rec, leveledUp, xpGained };
  } finally {
    if (gotLock) await releaseLock(tokenId);
  }
}

/**
 * ADMIN/SEED ONLY — set a citizen to a trained state in ONE write (no LLM, no
 * loop). For the FOUNDER to make showcase "display models" out of citizens he
 * controls (the 1/1s + honoraries) so the public showcase isn't empty before
 * real holders train theirs. Sets the dominant skill + a sensible level/rep +
 * ≥3 focus-tagged memory entries so deriveSpec yields a real class/rank/tuned-for.
 * Uses Math.max everywhere so re-running never downgrades a citizen.
 */
export async function seedProgress(args: {
  tokenId: number;
  skill: SkillKey;
  points: number;
  focus: string;
  /** Demo overrides. When omitted, derived from `points` (the showcase default). */
  targetLevel?: number;
  reputation?: number;
  jobsCompleted?: number;
  /** Named work-history lines (e.g. "Red-teamed launch plan"). Each is written
   *  as a focus-tagged mission entry so it shows in the memory log AND counts
   *  toward "tuned for". When omitted, generic "Trained <skill>" filler is used. */
  workHistory?: string[];
}): Promise<CitizenProgress> {
  const { tokenId, skill, points, focus, targetLevel, reputation, jobsCompleted, workHistory } = args;
  const gotLock = await acquireLock(tokenId);
  try {
    const rec = await getProgress(tokenId);
    rec.demo = true; // mark as a founder display-model (honesty flag)
    rec.skills[skill] = Math.max(rec.skills[skill] ?? 0, points);
    // Exact level when requested (xpForLevel is the inverse of the curve);
    // else ~30 xp/mission → an established level.
    const wantXp = targetLevel ? xpForLevel(targetLevel) : points * 30;
    rec.xp = Math.max(rec.xp, wantXp);
    rec.level = levelForXp(rec.xp);
    rec.reputation = Math.max(rec.reputation, reputation ?? points * 5);
    rec.jobsCompleted = Math.max(rec.jobsCompleted, jobsCompleted ?? points);

    const tag = `[focus:${focus.slice(0, 24)}]`;
    const now = Date.now();
    // Named work history → real-looking memory log. Each line is focus-tagged so
    // deriveTuning surfaces "tuned for X" (needs ≥3 of the same tag).
    if (workHistory && workHistory.length > 0) {
      for (let i = 0; i < workHistory.length; i++) {
        const line = `${workHistory[i]} ${tag}`;
        if (!rec.memoryLog.some((e) => e.description === line)) {
          rec.memoryLog.unshift({
            type: "mission",
            description: line,
            xpChange: 0,
            signalChange: 0,
            timestamp: now - i * 60_000,
          });
        }
      }
    }
    // Guarantee ≥3 focus-tagged entries even if workHistory was short/absent.
    const have = rec.memoryLog.filter((e) => e.type === "mission" && e.description.includes(tag)).length;
    for (let i = have; i < 3; i++) {
      rec.memoryLog.unshift({
        type: "mission",
        description: `Trained ${skill} ${tag}`,
        xpChange: 0,
        signalChange: 0,
        timestamp: now - (i + 100) * 1000,
      });
    }
    if (rec.memoryLog.length > MEMORY_CAP) rec.memoryLog.length = MEMORY_CAP;

    await setProgress(rec);
    await updateLeaderboards(rec);
    return rec;
  } finally {
    if (gotLock) await releaseLock(tokenId);
  }
}

/**
 * Append a single entry to a citizen's memory log without touching XP/skills.
 * Used by side-channel events that record on the citizen's public history but
 * aren't a job/mission run (e.g. an ASCENSION ⬡ burn). Newest-first, capped,
 * lock-guarded like the other mutators. Timestamp defaults to now.
 */
export async function addCitizenMemory(
  tokenId: number,
  entry: Omit<MemoryEntry, "timestamp"> & { timestamp?: number },
): Promise<void> {
  const gotLock = await acquireLock(tokenId);
  try {
    const rec = await getProgress(tokenId);
    rec.memoryLog.unshift({
      type: entry.type,
      description: entry.description,
      xpChange: entry.xpChange,
      signalChange: entry.signalChange,
      timestamp: entry.timestamp ?? Date.now(),
    });
    if (rec.memoryLog.length > MEMORY_CAP) rec.memoryLog.length = MEMORY_CAP;
    await setProgress(rec);
  } finally {
    if (gotLock) await releaseLock(tokenId);
  }
}

export type LeaderboardMetric = "level" | "rep" | "jobs";

export type LeaderboardRow = {
  tokenId: number;
  value: number;
  /** Founder display-model flag, carried through from the record (see
   *  CitizenProgress.demo). Only present when topCitizens is called with
   *  includeDemo — default calls filter these rows out entirely. */
  demo?: boolean;
};

const LB_KEY: Record<LeaderboardMetric, string> = {
  level: LB_LEVEL,
  rep: LB_REP,
  jobs: LB_JOBS,
};

/**
 * Bulk level/jobs for a set of citizens in TWO Redis commands (one ZMSCORE per
 * metric against the leaderboard zsets) — never N blob GETs. Sized for a
 * 200-token whale portfolio. Tokens with no progression yet aren't in the
 * zsets (null score) and are simply omitted from the result.
 */
export async function bulkLife(
  tokenIds: number[],
): Promise<Record<number, { level: number; jobs: number }>> {
  const out: Record<number, { level: number; jobs: number }> = {};
  if (tokenIds.length === 0) return out;
  if (!hasUpstash) {
    for (const id of tokenIds) {
      const rec = memory.get(id);
      if (rec && (rec.level > 1 || rec.jobsCompleted > 0)) {
        out[id] = { level: rec.level, jobs: rec.jobsCompleted };
      }
    }
    return out;
  }
  try {
    const members = tokenIds.map(String);
    const [levels, jobs] = (await Promise.all([
      upstash(["ZMSCORE", LB_LEVEL, ...members]),
      upstash(["ZMSCORE", LB_JOBS, ...members]),
    ])) as [(string | number | null)[] | null, (string | number | null)[] | null];
    tokenIds.forEach((id, i) => {
      const lv = levels?.[i] != null ? Number(levels[i]) : 0;
      const jb = jobs?.[i] != null ? Number(jobs[i]) : 0;
      if (lv > 1 || jb > 0) out[id] = { level: Math.max(1, lv), jobs: jb };
    });
  } catch {
    // Non-fatal — a roster without life badges beats a dead roster.
  }
  return out;
}

/**
 * Top citizens by a metric, via ZREVRANGE WITHSCORES (exact top-N, O(log N)).
 * In dev (no Upstash) sorts the in-memory Map. Citizens with zero of the
 * metric are filtered out so empty leaderboards read as empty, not as a wall
 * of level-1 zeros.
 *
 * DEMO FILTER (2026-06-10): founder-seeded display-models (CitizenProgress
 * .demo, set only by the seed tool) are EXCLUDED by default so they can never
 * headline a public proof surface unlabeled — homepage CityWeekBand, /report,
 * the Sunday signal-report X cron, and the v1 leaderboard API all call this.
 * Pass `includeDemo: true` only on surfaces that render the "· EXAMPLE"
 * label themselves (lib/top-agents → TopAgents/CitizenResume).
 */
export async function topCitizens(
  metric: LeaderboardMetric,
  limit = 50,
  opts: { includeDemo?: boolean } = {},
): Promise<LeaderboardRow[]> {
  const includeDemo = opts.includeDemo === true;
  if (!hasUpstash) {
    const field = metric === "level" ? "level" : metric === "rep" ? "reputation" : "jobsCompleted";
    return Array.from(memory.values())
      .map((r) => ({
        tokenId: r.tokenId,
        value: r[field] as number,
        ...(r.demo ? { demo: true } : {}),
      }))
      .filter((r) => r.value > (metric === "level" ? 1 : 0))
      .filter((r) => includeDemo || !r.demo)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }
  try {
    // Over-fetch 2× so filtering demo rows can still fill `limit`.
    const fetchN = Math.min(Math.max(limit * 2, limit), 200);
    const flat = (await upstash([
      "ZREVRANGE",
      LB_KEY[metric],
      "0",
      String(fetchN - 1),
      "WITHSCORES",
    ])) as string[] | null;
    if (!Array.isArray(flat)) return [];
    const rows: LeaderboardRow[] = [];
    for (let i = 0; i < flat.length; i += 2) {
      const tokenId = parseInt(flat[i], 10);
      const value = Number(flat[i + 1]);
      if (!Number.isFinite(tokenId)) continue;
      // A level-1 citizen that never worked still has level 1; only surface
      // citizens that have actually moved the metric.
      if (metric === "level" && value <= 1) continue;
      if (metric !== "level" && value <= 0) continue;
      rows.push({ tokenId, value });
    }
    // Enrich with the demo flag — the ZSET stores only tokenId+score, the
    // flag lives on the JSON record. One MGET for the whole slice.
    if (rows.length > 0) {
      try {
        const raw = (await upstash([
          "MGET",
          ...rows.map((r) => KEY(r.tokenId)),
        ])) as (string | null)[] | null;
        if (!Array.isArray(raw)) throw new Error("mget_unavailable");
        for (let i = 0; i < rows.length; i++) {
          const s = raw[i];
          if (!s) continue;
          try {
            if ((JSON.parse(s) as CitizenProgress).demo) rows[i].demo = true;
          } catch { /* unparseable record → treated as real (flag absent) */ }
        }
      } catch {
        // Enrichment failed: fail HONEST. Without the flag we cannot tell
        // display-models from real citizens, so public callers get nothing
        // (their empty-states self-hide) rather than possibly-seeded rows.
        if (!includeDemo) return [];
      }
    }
    const out = includeDemo ? rows : rows.filter((r) => !r.demo);
    return out.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Every tokenId with ANY recorded history — the union of the three leaderboard
 * sorted sets (level/rep/jobs). This is the set worth anchoring on-chain;
 * untrained all-zero citizens have nothing to prove and are excluded. Uses
 * ZRANGE over the small active set (NOT a SCAN of all 4040 keys). In dev (no
 * Upstash) reads the in-memory map.
 */
export async function listActiveTokenIds(): Promise<number[]> {
  if (!hasUpstash) {
    return Array.from(memory.values())
      .filter((r) => r.level > 1 || r.reputation > 0 || r.jobsCompleted > 0)
      .map((r) => r.tokenId)
      .sort((a, b) => a - b);
  }
  const ids = new Set<number>();
  for (const key of [LB_LEVEL, LB_REP, LB_JOBS]) {
    try {
      const members = (await upstash(["ZRANGE", key, "0", "-1"])) as string[] | null;
      if (Array.isArray(members)) {
        for (const m of members) {
          const id = parseInt(m, 10);
          if (Number.isFinite(id)) ids.add(id);
        }
      }
    } catch {
      /* skip a failed set — anchor over what we can read */
    }
  }
  return Array.from(ids).sort((a, b) => a - b);
}

/**
 * A citizen's rank (1-based) on the LEVEL leaderboard, or null if it has never
 * registered a score (an untrained level-1 citizen isn't ranked). Uses Redis
 * ZREVRANK — O(log N), exact. In dev (no Upstash) computes from the in-memory map.
 */
export async function getRankByLevel(tokenId: number): Promise<number | null> {
  if (!hasUpstash) {
    const sorted = Array.from(memory.values())
      .filter((r) => r.level > 1)
      .sort((a, b) => b.level - a.level);
    const idx = sorted.findIndex((r) => r.tokenId === tokenId);
    return idx >= 0 ? idx + 1 : null;
  }
  try {
    const rank = (await upstash(["ZREVRANK", LB_LEVEL, String(tokenId)])) as number | string | null;
    if (rank === null || rank === undefined) return null;
    return Number(rank) + 1; // ZREVRANK is 0-based
  } catch {
    return null;
  }
}
