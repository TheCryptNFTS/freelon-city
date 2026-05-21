/**
 * Inline sweep processor — credits unattributed sweeps for ONE specific wallet.
 * Runs when a wallet checks `/api/wallet/[addr]/hex`, so users see fresh sweep
 * bounties without waiting for the daily cron.
 *
 * Different from the daily cron at /api/cron/sweep-bounty (which scans all
 * recent sales globally). This version paginates events FOR a specific buyer
 * address, so it's bounded and cheap.
 */

import { CONTRACT } from "@/lib/constants";
import {
  creditWalletHex,
  getWalletHex,
  setWalletHex,
  todayUTC,
} from "@/lib/wallet-hex-store";

const PER_SWEEP = 25;
const DAILY_CAP_SWEEPS = 10; // 250 hex / 25 per sweep
const STREAK_BONUS = 100;
const STREAK_THRESHOLD = 3;
const STREAK_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES = 2;
const MAX_AGE_MS = 30 * 86400000; // Don't backfill more than 30 days

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

async function upstashGetSet(key: string, ttlSec: number): Promise<boolean> {
  // Returns true if the key was newly set (not seen before)
  if (!hasUpstash) return true; // Optimistic in dev — we'll skip dedupe
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    const r = await fetch(
      `${url}/SET/${encodeURIComponent(key)}/1/EX/${ttlSec}/NX`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!r.ok) return false;
    const j = (await r.json()) as { result: string | null };
    return j.result === "OK";
  } catch {
    return false;
  }
}

type SaleEvent = {
  event_type?: string;
  transaction?: string;
  event_timestamp?: number;
  buyer?: string;
  nft?: { identifier?: string };
};

export async function processSweepsForWallet(address: string): Promise<{
  credited: number;
  hex: number;
  bonus: boolean;
}> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return { credited: 0, hex: 0, bonus: false };

  let credited = 0;
  let hexCredited = 0;
  let bonus = false;
  let next: string | undefined;
  const minTs = Date.now() - MAX_AGE_MS;

  try {
    for (let p = 0; p < MAX_PAGES; p++) {
      const u = new URL(
        `https://api.opensea.io/api/v2/events/accounts/${address}`,
      );
      u.searchParams.set("event_type", "sale");
      u.searchParams.set("limit", "50");
      if (next) u.searchParams.set("next", next);
      const r = await fetch(u.toString(), {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 600 },
      });
      if (!r.ok) break;
      const d = (await r.json()) as { asset_events?: SaleEvent[]; next?: string };
      for (const ev of d.asset_events || []) {
        if (ev.event_type !== "sale") continue;
        const buyer = (ev.buyer || "").toLowerCase();
        if (buyer !== address.toLowerCase()) continue;
        const tx = ev.transaction || "";
        const tokenId = ev.nft?.identifier || "";
        const ts = (ev.event_timestamp || 0) * 1000;
        if (!tx || !tokenId || !ts) continue;
        if (ts < minTs) continue;

        // Verify token is from FREELON contract — accounts endpoint may include other collections
        // (the path is /events/accounts/{address} not contract-scoped). Filter by tokenId being a valid FREELON id.
        const tid = parseInt(tokenId, 10);
        if (!Number.isFinite(tid) || tid < 1 || tid > 4040) continue;

        const eventKey = `freelon:sweep:event:${tx}:${tokenId}`;
        const isNew = await upstashGetSet(eventKey, 2592000);
        if (!isNew) continue;

        // Check daily cap
        const rec = await getWalletHex(address);
        const today = todayUTC();
        if (rec.sweepsResetDay !== today) {
          rec.sweepsResetDay = today;
          rec.sweepsToday = 0;
          await setWalletHex(rec);
        }
        if (rec.sweepsToday >= DAILY_CAP_SWEEPS) continue;

        await creditWalletHex(address, PER_SWEEP, {
          kind: "sweep",
          ts,
          note: `Sweep · +${PER_SWEEP}⬡`,
        });
        const after = await getWalletHex(address);
        after.sweepsToday = (after.sweepsToday || 0) + 1;
        await setWalletHex(after);

        credited++;
        hexCredited += PER_SWEEP;

        // Streak bonus check (same logic as cron)
        const recentSweeps = after.events.filter(
          (e) => e.kind === "sweep" && Date.now() - e.ts < STREAK_WINDOW_MS,
        ).length;
        const alreadyBonus = after.events.some(
          (e) => e.kind === "sweep_streak" && Date.now() - e.ts < STREAK_WINDOW_MS,
        );
        if (recentSweeps >= STREAK_THRESHOLD && !alreadyBonus) {
          await creditWalletHex(address, STREAK_BONUS, {
            kind: "sweep_streak",
            ts,
            note: `${STREAK_THRESHOLD}+ sweeps in 24h · +${STREAK_BONUS}⬡`,
          });
          hexCredited += STREAK_BONUS;
          bonus = true;
        }
      }
      next = d.next;
      if (!next) break;
    }
  } catch {
    /* non-fatal */
  }

  return { credited, hex: hexCredited, bonus };
}
