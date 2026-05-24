/**
 * Notification event scanner — runs from the daily cron.
 *
 * Walks every known wallet hex record and fires notifications for:
 *   - decay-warning      : 3 days from passive-cliff (T-3)
 *   - streak-milestone-soon : T-1 from 7d or 30d streak unlock
 *   - watchlist-flag     : a citizen they watch is currently flagged red
 *
 * All deliveries are deduplicated via eventKey so re-running the cron
 * the same day is idempotent. Designed to be tucked into an existing
 * cron (we only have 2 slots on Vercel Hobby) so we don't burn one.
 */

import { listWalletHexRecords } from "@/lib/wallet-hex-store";
import { notify } from "@/lib/notify";
import { ECONOMY } from "@/lib/economy-constants";

const DAY_MS = 86_400_000;

function diffDaysUTC(from: string | null | undefined, to: string): number {
  if (!from) return Infinity;
  const f = Date.parse(from + "T00:00:00Z");
  const t = Date.parse(to + "T00:00:00Z");
  if (!isFinite(f) || !isFinite(t)) return Infinity;
  return Math.max(0, Math.round((t - f) / DAY_MS));
}

export type ScanResult = {
  walletsScanned: number;
  decayWarnings: number;
  streakWarnings: number;
  watchlistHits: number;
  errors: number;
};

export async function runNotifyScan(): Promise<ScanResult> {
  const todayISO = new Date().toISOString().slice(0, 10);
  const records = await listWalletHexRecords(500);
  const result: ScanResult = {
    walletsScanned: records.length,
    decayWarnings: 0,
    streakWarnings: 0,
    watchlistHits: 0,
    errors: 0,
  };

  // Pre-load active red-signal tokens — used for watchlist matching.
  // Done once per scan, not per wallet.
  const flaggedTokens = await loadFlaggedTokenIds();

  for (const rec of records) {
    try {
      const wallet = rec.address;

      // ── 1. Decay warning: fire at T-3 days from the 14-day cliff ──
      // i.e. when daysSinceActive == DECAY_DAYS - 3 (typically 11)
      const lastActive = rec.lastActiveDay ?? null;
      if (lastActive) {
        const since = diffDaysUTC(lastActive, todayISO);
        const warnAt = ECONOMY.ACTIVITY_DECAY_DAYS - 3;
        if (since === warnAt) {
          await notify({
            wallet,
            eventKey: `decay-warning:${todayISO}`,
            kind: "decay-warning",
            body: `⚠ 3 days until your hex meter cools. One claim resets it.`,
            href: "/carrier",
          });
          result.decayWarnings++;
        }
      }

      // ── 2. Streak milestone T-1 (day 6 → 7, day 29 → 30) ──
      const streak = rec.claimStreak ?? 0;
      if (streak === 6 || streak === 29) {
        const tomorrow = streak + 1;
        const bonus = tomorrow === 7 ? ECONOMY.STREAK_7_BONUS : ECONOMY.STREAK_30_BONUS;
        await notify({
          wallet,
          eventKey: `streak-t1:${tomorrow}:${todayISO}`,
          kind: "streak-milestone-soon",
          body: `⬡ Tomorrow's claim unlocks the ${tomorrow}-day streak bonus: +${bonus} ⬡. Don't break it.`,
          href: "/carrier",
        });
        result.streakWarnings++;
      }

      // ── 3. Watchlist flag hit ──
      // For each token currently flagged red, check the watchers set.
      // Implementation note: we scan once and deliver to every watcher
      // — the per-wallet dedupe in notify() prevents double-DM.
      // (Iteration done outside the per-wallet loop to be efficient.)
    } catch {
      result.errors++;
    }
  }

  // ── 3 (continued): walk flagged tokens once + notify their watchers ──
  for (const flag of flaggedTokens) {
    try {
      const { getWatchersOfToken } = await import("@/lib/watchlist-store");
      const watchers = await getWatchersOfToken(flag.tokenId);
      for (const w of watchers) {
        const r = await notify({
          wallet: w,
          eventKey: `watchlist-flag:${flag.tokenId}:${flag.flaggedAt}`,
          kind: "watchlist-flag",
          body: `● Citizen #${String(flag.tokenId).padStart(4, "0")} you watch is flagged · ${flag.priceEth.toFixed(4)} ETH · ~+${flag.bountyHex} ⬡ snipe bounty if you buy + hold ${ECONOMY.SNIPE_HOLD_DAYS}d.`,
          href: "/dashboard",
        });
        if (r.inboxed) result.watchlistHits++;
      }
    } catch {
      result.errors++;
    }
  }

  return result;
}

type FlaggedToken = {
  tokenId: number;
  priceEth: number;
  flaggedAt: number;
  bountyHex: number;
};

async function loadFlaggedTokenIds(): Promise<FlaggedToken[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return [];
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.freeloncity.com";
    const r = await fetch(`${base}/api/market/red-signals`, { cache: "no-store" });
    if (!r.ok) return [];
    const d = (await r.json()) as {
      signals?: Array<{ tokenId: number; priceEth: number; flaggedAt: number; bountyHex: number }>;
    };
    return d.signals || [];
  } catch {
    return [];
  }
}
