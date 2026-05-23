/**
 * Vercel cron — every 30 min (configure in vercel.json).
 *
 * Pulls recent OpenSea sales for the FREELON CITY contract, attributes
 * each sale to the buyer wallet, and credits hex:
 *   - +25 per citizen swept (capped at 250/day per wallet)
 *   - +100 streak bonus when same wallet hits 3+ sweeps in a 24h window
 *
 * Dedupes by event timestamp + transaction hash via Upstash SET, so re-runs
 * within the same window don't double-credit.
 *
 * Requires:
 *   CRON_SECRET (Bearer auth — same as daily-signal)
 *   OPENSEA_API_KEY
 *   UPSTASH_REDIS_REST_URL / _TOKEN
 */
import { NextResponse } from "next/server";
import { CONTRACT } from "@/lib/constants";
import { creditWalletHex, getWalletHex, setWalletHex, todayUTC } from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PER_SWEEP = ECONOMY.SWEEP_BOUNTY;
const DAILY_CAP = ECONOMY.SWEEP_DAILY_CAP;
const STREAK_BONUS = ECONOMY.SWEEP_STREAK_BONUS;
const STREAK_THRESHOLD = ECONOMY.SWEEP_STREAK_THRESHOLD;
const STREAK_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES = 4; // ~200 events per run

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

type SaleEvent = {
  event_type?: string;
  transaction?: string;
  event_timestamp?: number;
  buyer?: string;
  nft?: { identifier?: string };
};

export async function GET(req: Request) {
  // Fail closed in ALL environments — see daily-signal/route.ts comment.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_unconfigured" }, { status: 503 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.OPENSEA_API_KEY) {
    return NextResponse.json({ error: "no_opensea_key", processed: 0 });
  }

  let processed = 0;
  let credited = 0;
  let bonuses = 0;
  let next: string | undefined;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const u = new URL(
        `https://api.opensea.io/api/v2/events/chain/ethereum/contract/${CONTRACT}`,
      );
      u.searchParams.set("event_type", "sale");
      u.searchParams.set("limit", "50");
      if (next) u.searchParams.set("next", next);
      const r = await fetch(u.toString(), {
        headers: { "X-API-KEY": process.env.OPENSEA_API_KEY },
        cache: "no-store",
      });
      if (!r.ok) break;
      const d = (await r.json()) as { asset_events?: SaleEvent[]; next?: string };
      const events = d.asset_events || [];
      for (const ev of events) {
        if (ev.event_type !== "sale") continue;
        const buyer = (ev.buyer || "").toLowerCase();
        const tx = ev.transaction || "";
        const tokenId = ev.nft?.identifier || "";
        const ts = (ev.event_timestamp || 0) * 1000;
        if (!buyer || !tx || !tokenId || !ts) continue;

        const eventKey = `freelon:sweep:event:${tx}:${tokenId}`;
        if (hasUpstash) {
          try {
            const already = (await upstash(["GET", eventKey])) as string | null;
            if (already) continue;
            await upstash(["SETEX", eventKey, "2592000", "1"]); // 30d
          } catch {
            // If Upstash fails, skip this event (better than double-credit)
            continue;
          }
        }

        const result = await creditSweep(buyer, ts);
        if (result.credited > 0) {
          processed++;
          credited += result.credited;
          if (result.bonus) bonuses++;
        }
      }
      next = d.next;
      if (!next) break;
    }
  } catch (e) {
    console.error("sweep cron error", e);
  }

  // ── Piggyback: run the notification scan in the same cron slot.
  // Vercel Hobby caps us at 2 daily crons, both used. Folding the
  // notify scan in here is cheap (it reads the wallet records we
  // already touched) and idempotent via per-event dedupe.
  let notifyResult: Awaited<ReturnType<typeof import("@/lib/notify-scanner").runNotifyScan>> | null = null;
  try {
    const { runNotifyScan } = await import("@/lib/notify-scanner");
    notifyResult = await runNotifyScan();
  } catch (e) {
    console.error("notify scan error", e);
  }

  return NextResponse.json({
    processed,
    creditedHex: credited,
    streakBonuses: bonuses,
    notify: notifyResult,
    ranAt: Date.now(),
  });
}

async function creditSweep(
  buyer: string,
  ts: number,
): Promise<{ credited: number; bonus: boolean }> {
  const rec = await getWalletHex(buyer);
  const today = todayUTC();

  // Reset per-day cap counter
  if (rec.sweepsResetDay !== today) {
    rec.sweepsResetDay = today;
    rec.sweepsToday = 0;
    await setWalletHex(rec);
  }

  // Hit daily cap?
  if (rec.sweepsToday >= DAILY_CAP / PER_SWEEP) {
    return { credited: 0, bonus: false };
  }

  await creditWalletHex(buyer, PER_SWEEP, {
    kind: "sweep",
    ts,
    note: `Sweep · +${PER_SWEEP}⬡`,
  });
  const after = await getWalletHex(buyer);
  after.sweepsToday = (after.sweepsToday || 0) + 1;
  await setWalletHex(after);

  // Streak check: 3 sweeps in last 24h → +100 bonus (one-shot per window)
  let bonus = false;
  const recentSweeps = after.events.filter(
    (e) => e.kind === "sweep" && Date.now() - e.ts < STREAK_WINDOW_MS,
  ).length;
  const alreadyBonus = after.events.some(
    (e) => e.kind === "sweep_streak" && Date.now() - e.ts < STREAK_WINDOW_MS,
  );
  if (recentSweeps >= STREAK_THRESHOLD && !alreadyBonus) {
    await creditWalletHex(buyer, STREAK_BONUS, {
      kind: "sweep_streak",
      ts,
      note: `${STREAK_THRESHOLD}+ sweeps in 24h · +${STREAK_BONUS}⬡`,
    });
    bonus = true;
  }

  return { credited: PER_SWEEP, bonus };
}
