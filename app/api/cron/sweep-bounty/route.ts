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
  payment?: {
    quantity?: string;
    decimals?: number;
    symbol?: string;
    token_address?: string;
  };
};

const ETH_LIKE_SYMBOLS = new Set(["ETH", "WETH"]);
const ETH_LIKE_ADDRS = new Set([
  "0x0000000000000000000000000000000000000000", // native ETH placeholder
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH mainnet
]);
function isEthLikePayment(p: SaleEvent["payment"]): boolean {
  if (!p) return false;
  const sym = (p.symbol || "").toUpperCase();
  const addr = (p.token_address || "").toLowerCase();
  // If we have no metadata at all, assume ETH (OpenSea sometimes omits symbol).
  if (!sym && !addr) return true;
  if (sym && ETH_LIKE_SYMBOLS.has(sym)) return true;
  if (addr && ETH_LIKE_ADDRS.has(addr)) return true;
  return false;
}

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
  // Collected for the every-4h X autopost (lib/sales-pulse). We keep
  // the full sales batch the cron sees this run; the pulse runner
  // gates on a timestamp + per-tx dedupe so we never double-tweet.
  const pulseSales: import("@/lib/sales-pulse").PulseSale[] = [];

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

        // Collect sale for the 4h X autopost pulse (lib/sales-pulse).
        // We compute priceEth from the payment field if ETH-like; non-ETH
        // sales contribute count but not the volume tally.
        if (isEthLikePayment(ev.payment)) {
          const { paymentToEth } = await import("@/lib/eth-math");
          const priceEth = paymentToEth(ev.payment);
          const tidNum = parseInt(tokenId, 10);
          if (priceEth > 0 && Number.isFinite(tidNum)) {
            pulseSales.push({ tx, tokenId: tidNum, buyer, priceEth, ts });
          }
        }

        const result = await creditSweep(buyer, ts);
        if (result.credited > 0) {
          processed++;
          credited += result.credited;
          if (result.bonus) bonuses++;
        }

        // ── RESCUE detection ────────────────────────────────────────
        // If this sale closes against a currently-ghosted citizen PAST its
        // grace window, the buyer becomes the RESCUER: they earn a treasury
        // bounty + a share of the dump discount. The dumper has hex burned
        // from their balance proportional to the discount.
        //
        // Separate dedupe key from sweep-credit dedupe so a transient failure
        // here doesn't block retry, and a successful rescue doesn't double-fire.
        const rescueKey = `freelon:rescue:event:${tx}:${tokenId}`;
        if (hasUpstash) {
          try {
            const already = (await upstash(["GET", rescueKey])) as string | null;
            if (already) continue;
          } catch { /* fall through — better to retry than to silently skip */ }
        }
        try {
          const tid = parseInt(tokenId, 10);
          if (
            Number.isFinite(tid) && tid >= 1 && tid <= 4040 &&
            isEthLikePayment(ev.payment)
          ) {
            const { getGhost, clearGhost, recordRescue, appendDumpEntry, breakDefenderStreak } = await import("@/lib/ghost-store");
            const { debitWalletHex } = await import("@/lib/wallet-hex-store");
            const ghost = await getGhost(tid);
            // Sale price in wei via payment.quantity. Guarded for ETH-like
            // payments above so non-ETH sales can't be misread as discounts.
            const { paymentToEth } = await import("@/lib/eth-math");
            const priceEth = paymentToEth(ev.payment);
            const gracePast = !!ghost && Date.now() >= ghost.ghostedAt;
            if (
              ghost && ghost.status === "ghosted" && gracePast &&
              priceEth > 0 && priceEth <= ghost.floorEth * ECONOMY.DUMP_THRESHOLD
            ) {
              const discount = (ghost.floorEth - priceEth) / ghost.floorEth;
              // Rescuer hex: base bounty + 5% of (floor - price) in hex via peg
              const discountEth = Math.max(0, ghost.floorEth - priceEth);
              const discountHex = Math.round((discountEth * ECONOMY.HEX_PER_ETH * ECONOMY.RESCUE_DISCOUNT_PCT_TO_HEX) / 100);
              const rescuerPaid = ECONOMY.RESCUE_BOUNTY_BASE + discountHex;
              await creditWalletHex(buyer, rescuerPaid, {
                kind: "manual",
                note: `Rescue · #${String(tid).padStart(4, "0")} · ${(discount * 100).toFixed(0)}% under floor · +${rescuerPaid}⬡`,
              });
              // Dumper hex burn: proportional to discount, capped
              const burnRaw = Math.round(ECONOMY.HEX_PER_ETH * discountEth * (ECONOMY.DUMP_BURN_PCT_OF_DISCOUNT / 100));
              const burnAmt = Math.min(burnRaw, ECONOMY.DUMP_BURN_CAP);
              if (burnAmt > 0) {
                try {
                  await debitWalletHex(ghost.seller, burnAmt, {
                    kind: "manual",
                    note: `Dump burn · #${String(tid).padStart(4, "0")} · ${(discount * 100).toFixed(0)}% under floor · -${burnAmt}⬡`,
                  });
                } catch { /* dumper has insufficient hex — burn capped at their balance via debit's own check */ }
              }
              // Persist attribution + ledger
              await recordRescue({
                tokenId: tid, rescuer: buyer, dumper: ghost.seller,
                priceEth, floorEth: ghost.floorEth,
                hexPaid: rescuerPaid, hexBurned: burnAmt,
                rescuedAt: ts,
              });
              await appendDumpEntry({
                tokenId: tid, dumper: ghost.seller, rescuer: buyer,
                priceEth, floorEth: ghost.floorEth, discount, ts,
              });
              await breakDefenderStreak(ghost.seller);
              await clearGhost(tid);
              // Notify both parties
              try {
                const { notify } = await import("@/lib/notify");
                await notify({
                  wallet: buyer,
                  eventKey: `rescue:${tid}:${ts}`,
                  kind: "fresh-citizen",
                  body: `🛡 RESCUED #${String(tid).padStart(4, "0")} at ${(discount * 100).toFixed(0)}% under floor · +${rescuerPaid}⬡ + permanent attribution`,
                  href: `/citizens/${tid}`,
                });
                await notify({
                  wallet: ghost.seller,
                  eventKey: `dump-burn:${tid}:${ts}`,
                  kind: "decay-warning",
                  body: `⚠ #${String(tid).padStart(4, "0")} sold at ${(discount * 100).toFixed(0)}% under floor · -${burnAmt}⬡ burned · defender streak reset`,
                  href: "/graveyard",
                });
              } catch {/* non-fatal */}
              // Mark rescue dedupe only AFTER the full success path. If any
              // step above threw, the catch below skips this and the next
              // cron run retries cleanly.
              if (hasUpstash) {
                try { await upstash(["SETEX", rescueKey, "2592000", "1"]); } catch {}
              }
            }
          }
        } catch { /* rescue detection is non-blocking */ }
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

  // ── Piggyback: 4h X autopost pulse. Same reason — no spare cron
  // slot on Hobby. The pulse runner gates on a timestamp so this
  // cron call only actually tweets every 4h, even though sweep
  // itself runs every 30 min.
  let pulseResult: Awaited<ReturnType<typeof import("@/lib/sales-pulse").runSalesPulse>> | null = null;
  try {
    const { runSalesPulse } = await import("@/lib/sales-pulse");
    pulseResult = await runSalesPulse(pulseSales);
  } catch (e) {
    console.error("sales pulse error", e);
  }

  return NextResponse.json({
    processed,
    creditedHex: credited,
    streakBonuses: bonuses,
    notify: notifyResult,
    pulse: pulseResult,
    pulseSalesSeen: pulseSales.length,
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
