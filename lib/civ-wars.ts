/**
 * Civ Wars: weekly competition where civilizations rack up "active hex"
 * earnings via their citizens. The civ with the most active hex earned
 * this week is shown as the leader on /civ-wars.
 *
 * Scoring (this MVP):
 *   - Walk every WalletHex record's event ring buffer (last 50 events).
 *   - For each positive event in the current ISO week with a parseable
 *     `#NNNN` token id in the note, look up the citizen's civilization
 *     and add the amount to that civ's total.
 *   - Snipes, sales, naming-burns, listing bounty all naturally include
 *     the token id in their note. Daily claims / streaks have no token,
 *     so they don't score for any civ — they're "neutral" hex.
 *
 * Bonus crediting (next-week +10% on holder-tick for the winner civ's
 * citizens) is intentionally deferred to a separate batch — needs a
 * concurrency-safe winner snapshot. For now the page tells users
 * "winning civ earns +10% next cycle" and we'll settle manually.
 */

import { listWalletHexRecords } from "@/lib/wallet-hex-store";
import citizensData from "@/data/citizens.json";
import { CIVILIZATIONS } from "@/lib/constants";

type Citizen = { id: number; civilization: string };
const ID_TO_CIV = new Map<number, string>();
for (const c of citizensData as Citizen[]) ID_TO_CIV.set(c.id, c.civilization);

export type CivStanding = {
  slug: string;
  name: string;
  color: string;
  totalHex: number;
  events: number;
  topTokenId: number | null;
};

function isoWeekStart(d: Date = new Date()): number {
  // Start of UTC ISO week (Monday 00:00)
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = date.getUTCDay() || 7; // 1..7 (Mon..Sun)
  date.setUTCDate(date.getUTCDate() - (dow - 1));
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

export async function getCivStandings(): Promise<{
  weekStart: number;
  standings: CivStanding[];
  totalScoredHex: number;
}> {
  const since = isoWeekStart();
  const records = await listWalletHexRecords(500);
  const totals: Record<string, { hex: number; events: number; topTokenId: number | null; topAmt: number }> = {};

  for (const r of records) {
    for (const e of r.events) {
      if (e.ts < since) continue;
      if (e.amount <= 0) continue;
      // Parse #NNNN token id from the note
      const m = e.note?.match(/#(\d{1,4})/);
      if (!m) continue;
      const tid = Number(m[1]);
      const civSlug = ID_TO_CIV.get(tid);
      if (!civSlug) continue;
      if (!totals[civSlug]) totals[civSlug] = { hex: 0, events: 0, topTokenId: null, topAmt: 0 };
      totals[civSlug].hex += e.amount;
      totals[civSlug].events += 1;
      if (e.amount > totals[civSlug].topAmt) {
        totals[civSlug].topAmt = e.amount;
        totals[civSlug].topTokenId = tid;
      }
    }
  }

  const standings: CivStanding[] = Object.entries(CIVILIZATIONS).map(([slug, def]) => ({
    slug,
    name: def.name,
    color: def.color,
    totalHex: totals[slug]?.hex || 0,
    events: totals[slug]?.events || 0,
    topTokenId: totals[slug]?.topTokenId || null,
  }));
  standings.sort((a, b) => b.totalHex - a.totalHex);

  const totalScoredHex = standings.reduce((s, c) => s + c.totalHex, 0);
  return { weekStart: since, standings, totalScoredHex };
}
