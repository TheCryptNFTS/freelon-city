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
  creditWalletHexCapped,
  getWalletHex,
} from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";

const PER_SWEEP = ECONOMY.SWEEP_BOUNTY;
const DAILY_CAP_SWEEPS = ECONOMY.SWEEP_DAILY_CAP_COUNT; // 250 hex / 25 per sweep
const STREAK_BONUS = ECONOMY.SWEEP_STREAK_BONUS;
const STREAK_THRESHOLD = ECONOMY.SWEEP_STREAK_THRESHOLD;
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
  nft?: { identifier?: string; contract?: string };
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
      const { fetchWithTimeout } = await import("@/lib/fetch-with-timeout");
      const r = await fetchWithTimeout(u.toString(), {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 600 },
        timeoutMs: 6000,
      }).catch(() => null);
      if (!r) break;
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
        // (the path is /events/accounts/{address} not contract-scoped). Contract-scope (Prompt 2):
        // if the row carries a contract and it isn't ours, reject; when absent (the endpoint isn't
        // consistent) fall back to the tokenId-in-range check (mirrors the snipe path).
        const evContract = (ev.nft?.contract || "").toLowerCase();
        if (evContract && evContract !== CONTRACT.toLowerCase()) continue;
        const tid = parseInt(tokenId, 10);
        if (!Number.isFinite(tid) || tid < 1 || tid > 4040) continue;

        const eventKey = `freelon:sweep:event:${tx}:${tokenId}`;
        const isNew = await upstashGetSet(eventKey, 2592000);
        if (!isNew) continue;

        // Atomic cap-check + credit + counter increment in ONE wallet lock
        // (red-team finding B). Concurrent callers can no longer both pass the
        // cap and double-credit; if the daily cap is already reached this returns
        // credited:false and we skip. Per-event SET-NX above still prevents
        // re-crediting the same sale.
        const { credited: didCredit, rec: after } = await creditWalletHexCapped(
          address,
          PER_SWEEP,
          { kind: "sweep", ts, note: `Sweep · +${PER_SWEEP}⬡` },
          DAILY_CAP_SWEEPS,
        );
        if (!didCredit) continue; // daily cap reached

        credited++;
        hexCredited += PER_SWEEP;

        // Streak bonus check (same logic as cron). Guard with a per-day SET-NX so
        // two concurrent sweeps that both cross the threshold can't double-pay the
        // bonus (the in-record `alreadyBonus` read alone is not atomic).
        const recentSweeps = after.events.filter(
          (e) => e.kind === "sweep" && Date.now() - e.ts < STREAK_WINDOW_MS,
        ).length;
        const alreadyBonus = after.events.some(
          (e) => e.kind === "sweep_streak" && Date.now() - e.ts < STREAK_WINDOW_MS,
        );
        if (recentSweeps >= STREAK_THRESHOLD && !alreadyBonus) {
          const bonusKey = `freelon:sweep:streak:${address.toLowerCase()}:${new Date().toISOString().slice(0, 10)}`;
          if (await upstashGetSet(bonusKey, 172800)) {
            await creditWalletHex(address, STREAK_BONUS, {
              kind: "sweep_streak",
              ts,
              note: `${STREAK_THRESHOLD}+ sweeps in 24h · +${STREAK_BONUS}⬡`,
            }, { farmable: true });
            hexCredited += STREAK_BONUS;
            bonus = true;
          }
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
