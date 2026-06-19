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
import { cronAuthed } from "@/lib/cron-auth";
import { CONTRACT } from "@/lib/constants";
import { creditWalletHex, creditWalletHexCapped, getWalletHex, setWalletHex, todayUTC, InsufficientHexError } from "@/lib/wallet-hex-store";
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

/**
 * Atomic dedupe acquire — wraps `SET key "1" NX EX <ttl>`.
 * Returns true if the caller owns the key (proceed with side effects).
 * Returns false if the key already existed (skip — already processed).
 * Throws on infrastructure failure — caller must fail CLOSED (skip event,
 * do not credit). 2026-05-26 economy safety pass: replaces the prior
 * GET-then-SETEX two-step which had a race (two ticks could both GET
 * null then both credit) AND a silent-failure mode (SETEX after credit
 * failing would let the next tick double-credit).
 */
async function tryAcquireDedupe(key: string, ttlSec: number): Promise<boolean> {
  const result = await upstash(["SET", key, "1", "NX", "EX", String(ttlSec)]);
  return result === "OK";
}

/**
 * Structured cron logging. Always goes through console.warn/error so
 * Vercel surfaces it in the Functions log. Includes a `scope` so
 * grep is easy across thousands of cron runs.
 */
function logCronWarn(scope: string, ctx: Record<string, unknown>, err?: unknown): void {
  console.warn(`[sweep-bounty] ${scope}`, { ...ctx, error: err instanceof Error ? err.message : String(err ?? "") });
}
function logCronError(scope: string, ctx: Record<string, unknown>, err: unknown): void {
  console.error(`[sweep-bounty] ${scope}`, { ...ctx, error: err instanceof Error ? err.message : String(err) });
}

type SaleEvent = {
  event_type?: string;
  transaction?: string;
  event_timestamp?: number;
  buyer?: string;
  nft?: { identifier?: string; contract?: string };
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
  if (!cronAuthed(auth)) {
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
      // OpenSea v2 events: collection slug, NOT chain/contract.
      // The chain/contract variant returns 404 — discovered 2026-05-24
      // after weeks of silent zero-event runs. CONTRACT no longer used
      // here but kept as a build-time check that we're on the right
      // collection (slug "freelons" maps to that address).
      void CONTRACT;
      const u = new URL(
        `https://api.opensea.io/api/v2/events/collection/freelons`,
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

        // CONTRACT + RANGE SCOPE (security): only credit sweeps for the FREELON
        // contract and a valid 1..4040 tokenId. The inline path (lib/sweep-inline.ts
        // ~105-108) already does this; the cron didn't. Reject a row whose contract
        // is PRESENT and not ours (fail open on absence — the collection-events
        // endpoint isn't consistent), and always require an in-range tokenId so a
        // cross-collection sale can't be misattributed a +25/+100 sweep credit.
        const evContract = (ev.nft?.contract || "").toLowerCase();
        if (evContract && evContract !== CONTRACT.toLowerCase()) continue;
        const tidNumGuard = parseInt(tokenId, 10);
        if (!Number.isFinite(tidNumGuard) || tidNumGuard < 1 || tidNumGuard > 4040) continue;

        const eventKey = `freelon:sweep:event:${tx}:${tokenId}`;
        if (hasUpstash) {
          // BUG-04 fix 2026-05-26: switched from GET-then-SETEX (race +
          // silent-failure mode) to atomic SET NX EX. Fails CLOSED on
          // infrastructure error — better to skip a credit than to
          // double-credit. Every skip is now logged so a real Upstash
          // outage is visible in Vercel function logs (was previously
          // a silent `continue`).
          try {
            const acquired = await tryAcquireDedupe(eventKey, 2592000); // 30d
            if (!acquired) continue; // already processed this sale
          } catch (e) {
            logCronError("sweep.dedupe.acquire.failed", { tx, tokenId, buyer }, e);
            continue;
          }
        }

        // Collect sale for the 4h X autopost pulse (lib/sales-pulse) AND
        // credit the per-citizen hex ledger (+25 ⬡ per sale, idempotent
        // by tx:tokenId). The per-citizen ledger powers the citizen
        // detail page "VALUE + RANK" card and the dashboard top-N.
        if (isEthLikePayment(ev.payment)) {
          const { paymentToEth } = await import("@/lib/eth-math");
          const priceEth = paymentToEth(ev.payment);
          const tidNum = parseInt(tokenId, 10);
          if (priceEth > 0 && Number.isFinite(tidNum)) {
            pulseSales.push({ tx, tokenId: tidNum, buyer, priceEth, ts });
            try {
              const { creditCitizenSale } = await import("@/lib/citizen-value-store");
              await creditCitizenSale({ tokenId: tidNum, tx, priceEth, ts: Math.floor(ts / 1000) });
            } catch (e) {
              // R1 fix 2026-05-26: was silent. Per-token value credit
              // is non-fatal to the sweep ledger (has its own SETNX),
              // but a recurring failure here means the citizen card
              // value/rank columns drift — worth surfacing.
              logCronWarn("sweep.citizenValue.failed", {
                tx, tokenId, buyer, tidNum, priceEth,
              }, e);
            }

            // Record sweep event for /hold-the-line "Recent Sweepers"
            // panel — aggregates by buyer wallet over trailing 4h window.
            // Sister system to defender-store (which tracks bid offers).
            try {
              const { recordSweep } = await import("@/lib/sweeper-store");
              await recordSweep({
                wallet: buyer,
                tokenId: tidNum,
                priceEth,
                ts: Math.floor(ts / 1000),
                tx,
              });
            } catch (e) {
              // R2 fix 2026-05-26: was silent. recordSweep powers the
              // /hold-the-line "Recent Sweepers" panel — read-only UI
              // feed, but worth visibility if it starts failing.
              logCronWarn("sweep.sweeperFeed.failed", {
                tx, tokenId, buyer, tidNum, priceEth,
              }, e);
            }
          }
        }

        // Collapse-mode earn multiplier applied inside creditSweep itself
        // so the dedupe key still represents "this event was processed".
        // R3 fix 2026-05-26: wrap creditSweep in try/catch with DEL
        // rollback on the sweep eventKey (and ONLY this event's sweep
        // key — never the rescue key, never any downstream key). If
        // the wallet credit fails after we already acquired dedupe,
        // releasing the key lets the next cron tick retry instead of
        // leaving the credit lost forever.
        try {
          const result = await creditSweep(buyer, ts);
          if (result.credited > 0) {
            processed++;
            credited += result.credited;
            if (result.bonus) bonuses++;
          }
        } catch (e) {
          logCronError("sweep.credit.failed", { tx, tokenId, buyer, eventKey }, e);
          if (hasUpstash) {
            try {
              await upstash(["DEL", eventKey]);
            } catch (delErr) {
              logCronError("sweep.dedupe.rollback.failed", { tx, tokenId, eventKey }, delErr);
            }
          }
          // Skip the rescue path for this event — if the primary credit
          // didn't land, attempting the rescue side-effects would push
          // ledger inconsistency further.
          continue;
        }

        // ── RESCUE detection ────────────────────────────────────────
        // If this sale closes against a currently-ghosted citizen PAST its
        // grace window, the buyer becomes the RESCUER: they earn a treasury
        // bounty + a share of the dump discount. The dumper has hex burned
        // from their balance proportional to the discount.
        //
        // BUG-03 fix 2026-05-26: dedupe restructured from "GET-then-credit-
        // then-SETEX" (which double-credited if the GET failed transiently
        // OR if the final SETEX failed after a successful credit) to
        // "atomic-SET-NX-EX BEFORE credit, DEL on failure to roll back".
        // This is the only correct pattern for at-most-once paid events.
        const rescueKey = `freelon:rescue:event:${tx}:${tokenId}`;
        let rescueAcquired = false;
        if (hasUpstash) {
          try {
            rescueAcquired = await tryAcquireDedupe(rescueKey, 2592000); // 30d
            if (!rescueAcquired) continue; // already rescued — skip
          } catch (e) {
            // Fail CLOSED. If we can't confirm dedupe, do not pay.
            logCronError("rescue.dedupe.acquire.failed", { tx, tokenId, buyer }, e);
            continue;
          }
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
              // Collapse-mode escalation: rescue is more lucrative + dump
              // burns harder when the floor is sliding. Loaded inside the
              // try block so a collapse-store failure can't kill rescue.
              const { getCollapseState } = await import("@/lib/collapse-mode");
              const collapse = await getCollapseState();

              const discountEth = Math.max(0, ghost.floorEth - priceEth);
              const discountHex = Math.round((discountEth * ECONOMY.HEX_PER_ETH * ECONOMY.RESCUE_DISCOUNT_PCT_TO_HEX) / 100);
              const baseBounty = ECONOMY.RESCUE_BOUNTY_BASE + discountHex;
              const rescuerPaid = collapse.active
                ? Math.round(baseBounty * collapse.rescueBountyMultiplier)
                : baseBounty;
              await creditWalletHex(buyer, rescuerPaid, {
                kind: "manual",
                note: `Rescue · #${String(tid).padStart(4, "0")} · ${(discount * 100).toFixed(0)}% under floor · +${rescuerPaid}⬡${collapse.active ? " (COLLAPSE 3×)" : ""}`,
              });
              // Dumper hex burn: proportional to discount, capped. Under
              // collapse, BOTH the % of discount and the cap escalate so
              // dumping during a downturn actually costs.
              const burnPct = collapse.active
                ? ECONOMY.DUMP_BURN_PCT_OF_DISCOUNT * collapse.dumpBurnMultiplier
                : ECONOMY.DUMP_BURN_PCT_OF_DISCOUNT;
              const burnRaw = Math.round(ECONOMY.HEX_PER_ETH * discountEth * (burnPct / 100));
              const burnCap = collapse.active
                ? ECONOMY.DUMP_BURN_CAP * collapse.dumpBurnMultiplier
                : ECONOMY.DUMP_BURN_CAP;
              const burnAmt = Math.min(burnRaw, burnCap);
              // BUG-11 fix 2026-05-26: track ACTUAL burned amount.
              // Previous code passed `burnAmt` to recordRescue regardless
              // of whether debitWalletHex actually succeeded — meaning
              // the ledger lied about burned amount when debit failed for
              // ANY reason (insufficient balance OR Upstash/RPC error).
              // Now: log every debit failure with full context, and pass
              // the real burned amount through to the ledger.
              let burnApplied = 0;
              if (burnAmt > 0) {
                try {
                  await debitWalletHex(ghost.seller, burnAmt, {
                    kind: "manual",
                    note: `Dump burn · #${String(tid).padStart(4, "0")} · ${(discount * 100).toFixed(0)}% under floor · -${burnAmt}⬡`,
                  });
                  burnApplied = burnAmt;
                } catch (e) {
                  // R4 fix 2026-05-26: split expected business failure
                  // (dumper can't afford the burn — expected and capped
                  // by debit's own check) from unknown infra failure
                  // (Upstash/RPC/etc — needs visibility for ops).
                  // Rescue still proceeds: rescuer was already credited
                  // above; ledger records burnApplied: 0 truthfully.
                  if (e instanceof InsufficientHexError) {
                    logCronWarn("rescue.debit.insufficientBalance", {
                      tx, tokenId, seller: ghost.seller,
                      burnAmt, balance: e.balance,
                    });
                  } else {
                    logCronError("rescue.debit.infraFailure", {
                      tx, tokenId, seller: ghost.seller, burnAmt,
                    }, e);
                  }
                }
              }
              // Persist attribution + ledger — use ACTUAL burned amount
              await recordRescue({
                tokenId: tid, rescuer: buyer, dumper: ghost.seller,
                priceEth, floorEth: ghost.floorEth,
                hexPaid: rescuerPaid, hexBurned: burnApplied,
                rescuedAt: ts,
              });
              await appendDumpEntry({
                tokenId: tid, dumper: ghost.seller, rescuer: buyer,
                priceEth, floorEth: ghost.floorEth, discount, ts,
              });
              await breakDefenderStreak(ghost.seller);
              await clearGhost(tid);
              // BUG-08 fix 2026-05-26: notify failure was previously
              // swallowed silently. Rescue itself succeeds — the ledger
              // is correct — but if neither party gets notified, that's
              // an operational issue worth surfacing. Log per failed
              // notify so a real outage is visible without corrupting
              // event integrity.
              const { notify } = await import("@/lib/notify");
              try {
                await notify({
                  wallet: buyer,
                  eventKey: `rescue:${tid}:${ts}`,
                  kind: "fresh-citizen",
                  body: `⬡ RESCUED #${String(tid).padStart(4, "0")} at ${(discount * 100).toFixed(0)}% under floor · +${rescuerPaid}⬡ + permanent attribution`,
                  href: `/citizens/${tid}`,
                });
              } catch (e) {
                logCronWarn("rescue.notify.buyer.failed", {
                  tx, tokenId, buyer, tid,
                }, e);
              }
              try {
                await notify({
                  wallet: ghost.seller,
                  eventKey: `dump-burn:${tid}:${ts}`,
                  kind: "decay-warning",
                  body: `⚠ #${String(tid).padStart(4, "0")} sold at ${(discount * 100).toFixed(0)}% under floor · -${burnApplied}⬡ burned · defender streak reset`,
                  href: "/graveyard",
                });
              } catch (e) {
                logCronWarn("rescue.notify.seller.failed", {
                  tx, tokenId, seller: ghost.seller, tid,
                }, e);
              }
              // BUG-03 fix 2026-05-26: dedupe key was acquired BEFORE
              // the rescue ran (via tryAcquireDedupe at line ~211). If
              // we got here, the rescue succeeded — nothing more to do.
              // The old post-success SETEX is gone because the atomic
              // acquire already wrote the key.
            }
          }
        } catch (e) {
          // Any throw inside the rescue block means the rescue did NOT
          // complete cleanly. Release the dedupe key so the next cron
          // run can retry — without this rollback, a partial failure
          // would block the rescue forever (under-credit).
          logCronError("rescue.processing.failed", { tx, tokenId, buyer }, e);
          if (hasUpstash && rescueAcquired) {
            try { await upstash(["DEL", rescueKey]); }
            catch (delErr) {
              logCronError("rescue.dedupe.rollback.failed", { tx, tokenId, rescueKey }, delErr);
            }
          }
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

  // ── Piggyback: weekly receipts. Runs every Sunday UTC, gated by
  // a once-per-week Redis timestamp. Posts a thread with the week's
  // volume + holders + hex flow + top transmission + rescues.
  let receiptsResult: Awaited<ReturnType<typeof import("@/lib/weekly-receipts").runWeeklyReceipts>> | null = null;
  try {
    const { runWeeklyReceipts } = await import("@/lib/weekly-receipts");
    receiptsResult = await runWeeklyReceipts();
  } catch (e) {
    console.error("weekly receipts error", e);
  }

  // ── Piggyback: Carrier of the Week resolution. ISO-week-idempotent
  // (SET-NX gate), so running it every sweep tick is safe — only the
  // first tick of a new week actually crowns. Recognition only: moves
  // NO ⬡. Honored kill-switch CARRIER_OF_WEEK_OFF. Same "no spare cron
  // slot on Hobby" reasoning as weekly-receipts above.
  let carrierResult: Awaited<ReturnType<typeof import("@/lib/carrier-of-week").resolveCarrierOfWeek>> | null = null;
  if (process.env.CARRIER_OF_WEEK_OFF !== "1") {
    try {
      const { resolveCarrierOfWeek } = await import("@/lib/carrier-of-week");
      carrierResult = await resolveCarrierOfWeek();
    } catch (e) {
      console.error("carrier of week error", e);
    }
  }

  // ── Piggyback: reply engagement scan. Replies submitted ≥24h ago
  // get their like count checked; ≥3 likes earns the bonus.
  let engagementResult: Awaited<ReturnType<typeof import("@/lib/reply-engagement-scan").runReplyEngagementScan>> | null = null;
  try {
    const { runReplyEngagementScan } = await import("@/lib/reply-engagement-scan");
    engagementResult = await runReplyEngagementScan();
  } catch (e) {
    console.error("reply engagement scan error", e);
  }

  // ── Piggyback: defender bid wall auto-detection. Pulls active
  // OpenSea collection offers, credits hex for new qualifying bids
  // (≥ 1.4× floor), awards 7-day hold bonuses. SETNX dedupe means
  // running every cron tick is safe.
  let defenderResult: Awaited<ReturnType<typeof import("@/lib/defender-scan").runDefenderScan>> | null = null;
  try {
    const { runDefenderScan } = await import("@/lib/defender-scan");
    defenderResult = await runDefenderScan();
  } catch (e) {
    console.error("defender scan error", e);
  }

  // ── Piggyback: SWEEP BURST autopost. Fires when ≥5 fresh citizens
  // sold in a 4h window. Posts a 3×2 grid X tweet + broadcasts an
  // in-app notification to the top ~100 holders. Independent 4h gate
  // from sales-pulse so they don't silence each other.
  let burstResult: Awaited<ReturnType<typeof import("@/lib/sweep-burst").runSweepBurst>> | null = null;
  try {
    const { runSweepBurst } = await import("@/lib/sweep-burst");
    burstResult = await runSweepBurst(pulseSales);
  } catch (e) {
    console.error("sweep burst error", e);
  }

  return NextResponse.json({
    processed,
    creditedHex: credited,
    streakBonuses: bonuses,
    notify: notifyResult,
    pulse: pulseResult,
    pulseSalesSeen: pulseSales.length,
    receipts: receiptsResult,
    carrier: carrierResult,
    engagement: engagementResult,
    defenders: defenderResult,
    burst: burstResult,
    ranAt: Date.now(),
  });
}

async function creditSweep(
  buyer: string,
  ts: number,
): Promise<{ credited: number; bonus: boolean }> {
  // Collapse-mode earn multiplier — when floor is low and the index is sliding,
  // halve the sweep bounty so inflation stops outpacing burn. Computed BEFORE the
  // credit so the atomic helper records the right amount.
  const { getCollapseState, applyEarnMultiplier } = await import("@/lib/collapse-mode");
  const collapse = await getCollapseState();
  const sweepHex = applyEarnMultiplier(PER_SWEEP, collapse);
  const noteSuffix = collapse.active ? " (collapse ½)" : "";

  // Atomic: day-reset + per-day cap check + balance credit + sweepsToday++ inside
  // ONE wallet lock (red-team 2026-06-14). Replaces the prior unlocked
  // getWalletHex → creditWalletHex → re-read → setWalletHex(sweepsToday+1), whose
  // trailing unlocked write could clobber a concurrent user balance mutation
  // (losing a credit, or restoring just-spent HEX). Mirrors lib/sweep-inline.ts.
  const { credited, rec } = await creditWalletHexCapped(
    buyer,
    sweepHex,
    { kind: "sweep", ts, note: `Sweep · +${sweepHex}⬡${noteSuffix}` },
    DAILY_CAP / PER_SWEEP,
  );
  if (!credited) return { credited: 0, bonus: false };

  // Streak check: 3 sweeps in last 24h → +100 bonus (one-shot per window). Reads
  // the post-credit record returned by the locked credit above.
  let bonus = false;
  const recentSweeps = rec.events.filter(
    (e) => e.kind === "sweep" && Date.now() - e.ts < STREAK_WINDOW_MS,
  ).length;
  const alreadyBonus = rec.events.some(
    (e) => e.kind === "sweep_streak" && Date.now() - e.ts < STREAK_WINDOW_MS,
  );
  if (recentSweeps >= STREAK_THRESHOLD && !alreadyBonus) {
    const streakHex = applyEarnMultiplier(STREAK_BONUS, collapse);
    await creditWalletHex(buyer, streakHex, {
      kind: "sweep_streak",
      ts,
      note: `${STREAK_THRESHOLD}+ sweeps in 24h · +${streakHex}⬡${noteSuffix}`,
    }, { farmable: true });
    bonus = true;
  }

  return { credited: sweepHex, bonus };
}
