/**
 * CARRIER OF THE WEEK — weekly recognition ritual (v1).
 *
 * Each ISO week the city crowns ONE FREELON judged purely on ON-CHAIN MERIT
 * (the existing level leaderboard via lib/top-agents). The winner gets:
 *   - a permanent, NON-TRANSFERABLE laurel stamped on the token's public
 *     memory log (survives sale — it lives on the tokenId, not the wallet), and
 *   - the global "featured carrier" slot for that week (read by the public page
 *     and homepage).
 *
 * HARD GUARDRAILS (do not weaken — security + legal converged on these):
 *   - ZERO PAYOUT. This module NEVER credits ⬡. It does not import or call
 *     creditWalletHex, and it touches NO ⬡ balance. The reward is recognition
 *     only: a featured slot + a non-transferable badge. grep this file for
 *     `creditWalletHex` — there must be zero hits.
 *   - JUDGED ON MERIT, not luck. Winner = top of the LEVEL leaderboard among
 *     specialized agents (topTrainedAgents). No RNG anywhere.
 *   - IDEMPOTENT per ISO week. A SET-NX gate keyed by ISO week means re-running
 *     the resolution in the same week is a no-op: it never double-stamps the
 *     laurel and never re-picks. The stored winner record is returned instead.
 *   - FAIL-SAFE. A resolution error must never corrupt progression. The laurel
 *     stamp is the LAST mutation and is best-effort; if anything throws we
 *     return { ok:false } and leave the gate UN-set so a later run can retry.
 *
 * Mirrors lib/weekly-receipts.ts: piggybacks on the sweep-bounty cron, gates on
 * an Upstash key so only one resolution per ISO week takes effect. Unlike the
 * receipts (which only tweet), this one persists a winner record + stamps the
 * token, so the idempotency gate is acquired ATOMICALLY *before* any mutation.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";
import { topTrainedAgents, type TopAgent } from "@/lib/top-agents";
import { addCitizenMemory, getProgress } from "@/lib/progression-store";
import { getCitizen } from "@/lib/citizens";
import { CIVILIZATIONS, type CivilizationSlug } from "@/lib/constants";

/** The persisted winner record. Pure recognition data — no ⬡, no balances. */
export type CarrierOfWeek = {
  isoYear: number;
  isoWeek: number;
  weekKey: string; // "2026-W23"
  tokenId: number;
  name: string;
  civSlug: string;
  civName: string;
  civColor: string;
  level: number;
  className: string;
  rankLabel: string;
  tunedFor: string | null;
  /** Honesty flag: the pick is a founder display-model, not real holder activity. */
  demo: boolean;
  crownedAt: number;
};

const KEY_CURRENT = "freelon:carrier-of-week:current"; // last crowned winner (record JSON)
const KEY_GATE = (weekKey: string) => `freelon:carrier-of-week:gate:${weekKey}`;

// Dev fallback (no Upstash). globalThis-backed so it's shared across Next's
// per-route module bundles in dev. In prod hasUpstash is always true.
const mem: { current: CarrierOfWeek | null; gates: Set<string> } =
  ((globalThis as { __freelonCarrierMem?: { current: CarrierOfWeek | null; gates: Set<string> } })
    .__freelonCarrierMem ??= { current: null, gates: new Set<string>() });

/** ISO week number (Thursday-anchored, 1..53) + its ISO year. */
export function isoWeekParts(date: Date): { isoYear: number; isoWeek: number } {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum); // shift to the week's Thursday
  const isoYear = tmp.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear, isoWeek };
}

export function weekKeyOf(date: Date): string {
  const { isoYear, isoWeek } = isoWeekParts(date);
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

function civOf(slug: string): { name: string; color: string } {
  const civ = CIVILIZATIONS[slug as CivilizationSlug];
  return civ ? { name: civ.name, color: civ.color } : { name: "FREELON CITY", color: "#C8A75D" };
}

/** Read the currently-crowned carrier (the global featured slot). */
export async function getCurrentCarrier(): Promise<CarrierOfWeek | null> {
  if (!hasUpstash) return mem.current;
  try {
    const raw = (await upstash(["GET", KEY_CURRENT])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as CarrierOfWeek;
  } catch {
    return null;
  }
}

/**
 * Atomically claim this ISO week's resolution. Returns true exactly once per
 * week (the run that should do the work). A 9-day TTL self-heals a missed week
 * into the next without ever leaving a stale gate. Fails CLOSED (returns false)
 * on infra error — better to skip a week than to double-stamp.
 */
async function claimWeek(weekKey: string): Promise<boolean> {
  if (!hasUpstash) {
    if (mem.gates.has(weekKey)) return false;
    mem.gates.add(weekKey);
    return true;
  }
  try {
    const res = await upstash(["SET", KEY_GATE(weekKey), "1", "NX", "EX", String(9 * 24 * 60 * 60)]);
    return res === "OK";
  } catch {
    return false;
  }
}

/** Mark the week as resolved (used after a forced crown so the normal cron
 *  path sees it as already-resolved instead of crowning again). */
async function markWeek(weekKey: string): Promise<void> {
  if (!hasUpstash) {
    mem.gates.add(weekKey);
    return;
  }
  try {
    await upstash(["SET", KEY_GATE(weekKey), "1", "EX", String(9 * 24 * 60 * 60)]);
  } catch {
    /* non-fatal */
  }
}

/** Release the week gate so a later run can retry (used only on failure). */
async function releaseWeek(weekKey: string): Promise<void> {
  if (!hasUpstash) {
    mem.gates.delete(weekKey);
    return;
  }
  try {
    await upstash(["DEL", KEY_GATE(weekKey)]);
  } catch {
    /* non-fatal — the TTL will eventually clear it */
  }
}

async function persistCurrent(rec: CarrierOfWeek): Promise<void> {
  if (!hasUpstash) {
    mem.current = rec;
    return;
  }
  await upstash(["SET", KEY_CURRENT, JSON.stringify(rec)]);
}

export type ResolveResult =
  | { ok: true; reason: "crowned"; carrier: CarrierOfWeek }
  | { ok: true; reason: "already_resolved"; carrier: CarrierOfWeek | null }
  | { ok: true; reason: "no_eligible"; carrier: null }
  | { ok: false; reason: string };

/**
 * Resolve (and crown) this ISO week's Carrier of the Week.
 *
 * Idempotent: the FIRST call in a given ISO week does the work; subsequent
 * calls short-circuit to { reason:"already_resolved" } and return the stored
 * record (no re-pick, no second laurel). Pass { force:true } in dev/admin to
 * bypass the gate for a manual trigger.
 *
 * NO ⬡ is moved. The only mutation to a citizen is a single recognition-only
 * MemoryEntry (signalChange:0, xpChange:0) — the laurel.
 */
export async function resolveCarrierOfWeek(opts: { force?: boolean; at?: Date } = {}): Promise<ResolveResult> {
  const now = opts.at ?? new Date();
  const { isoYear, isoWeek } = isoWeekParts(now);
  const weekKey = weekKeyOf(now);

  // Idempotency gate — claim the week before any mutation.
  if (!opts.force) {
    const claimed = await claimWeek(weekKey);
    if (!claimed) {
      const current = await getCurrentCarrier();
      // Only treat as "already resolved" if the stored winner IS this week's.
      if (current && current.weekKey === weekKey) {
        return { ok: true, reason: "already_resolved", carrier: current };
      }
      // Gate was held but no matching record (a prior run claimed then failed
      // before persisting). Let it retry by releasing and proceeding.
      await releaseWeek(weekKey);
      const reclaimed = await claimWeek(weekKey);
      if (!reclaimed) return { ok: true, reason: "already_resolved", carrier: current };
    }
  }

  try {
    // MERIT pick — top of the level leaderboard among SPECIALIZED agents.
    const top: TopAgent[] = await topTrainedAgents(1).catch(() => []);
    const winner = top[0];
    if (!winner) {
      // Nothing eligible yet. Release the gate so next week (or a later run
      // once data exists) can crown. Never persist an empty winner.
      if (!opts.force) await releaseWeek(weekKey);
      return { ok: true, reason: "no_eligible", carrier: null };
    }

    const citizen = getCitizen(winner.tokenId);
    const civSlug = citizen?.civilization ?? "blue-synthesis";
    const { name: civName, color: civColor } = civOf(civSlug);
    const id4 = String(winner.tokenId).padStart(4, "0");
    const displayName = citizen?.name || `Citizen #${id4}`;

    const rec: CarrierOfWeek = {
      isoYear,
      isoWeek,
      weekKey,
      tokenId: winner.tokenId,
      name: displayName,
      civSlug,
      civName,
      civColor,
      level: winner.level,
      className: winner.className,
      rankLabel: winner.rankLabel,
      tunedFor: winner.tunedFor,
      demo: winner.demo,
      crownedAt: now.getTime(),
    };

    // Persist the featured slot FIRST so the page can render even if the
    // (best-effort) laurel stamp below hiccups.
    await persistCurrent(rec);

    // Stamp the permanent, non-transferable laurel on the token's public
    // memory log. Recognition only: zero ⬡, zero XP. The week gate normally
    // guarantees one crown per week, but a force re-run (or the same winner
    // crowned in a later week) must not duplicate THIS week's badge — so we
    // dedupe defensively on the per-week laurel marker before stamping.
    const laurel = `Crowned Carrier of the Week · ${weekKey} · recognition only`;
    const existing = await getProgress(winner.tokenId).catch(() => null);
    const alreadyStamped = !!existing?.memoryLog.some((e) => e.description === laurel);
    if (!alreadyStamped) {
      await addCitizenMemory(winner.tokenId, {
        type: "levelup", // recognition milestone — reuses the existing entry kinds
        description: laurel,
        xpChange: 0,
        signalChange: 0,
      });
    }

    // If this was a forced run, the week gate was bypassed and never set —
    // mark it now so the normal cron path treats the week as resolved and
    // does not crown a second time.
    if (opts.force) await markWeek(weekKey);

    return { ok: true, reason: "crowned", carrier: rec };
  } catch (e) {
    // Fail-safe: leave the gate UN-set so a later run retries; never corrupt
    // progression (the only mutation is the additive memory stamp above, and
    // if we threw before it, nothing was written).
    if (!opts.force) await releaseWeek(weekKey);
    return { ok: false, reason: e instanceof Error ? e.message : "resolve_failed" };
  }
}
