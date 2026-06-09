/**
 * Reply engagement scan — runs inside the sweep-bounty cron.
 *
 * For every reply submitted ≥24h ago that hasn't been scanned yet,
 * fetch its current like_count via X v2. If ≥ REPLY_ENGAGEMENT_THRESHOLD
 * likes, credit the carrier's wallet with the bonus and mark scanned.
 *
 * Bounded to 50 scans per cron tick to avoid X rate-limits + Vercel
 * function timeout.
 */

import { ECONOMY } from "@/lib/economy-constants";
import { creditWalletHex } from "@/lib/wallet-hex-store";
import {
  listPendingEngagementScans,
  clearPendingScan,
  getReply,
  updateReply,
} from "@/lib/reply-store";

type LikeLookup = { ok: boolean; likes?: number; reason?: string };

async function lookupLikes(tweetId: string): Promise<LikeLookup> {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) return { ok: false, reason: "no_bearer" };
  try {
    const u = new URL(`https://api.x.com/2/tweets/${encodeURIComponent(tweetId)}`);
    u.searchParams.set("tweet.fields", "public_metrics");
    const r = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${bearer}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!r.ok) return { ok: false, reason: `http_${r.status}` };
    const j = (await r.json()) as {
      data?: { public_metrics?: { like_count?: number } };
    };
    return { ok: true, likes: j.data?.public_metrics?.like_count ?? 0 };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message.slice(0, 40) : "unknown" };
  }
}

export type EngagementScanResult = {
  scanned: number;
  paid: number;
  totalBonusHex: number;
};

export async function runReplyEngagementScan(): Promise<EngagementScanResult> {
  const ids = await listPendingEngagementScans();
  if (ids.length === 0) return { scanned: 0, paid: 0, totalBonusHex: 0 };

  let scanned = 0;
  let paid = 0;
  let totalBonusHex = 0;

  for (const id of ids) {
    scanned++;
    const rec = await getReply(id);
    if (!rec || rec.bonusScanned) {
      await clearPendingScan(id);
      continue;
    }
    const lk = await lookupLikes(id);
    // If lookup fails transiently, leave the scan pending for retry next tick.
    if (!lk.ok) continue;
    rec.bonusScanned = true;
    rec.likesAtScan = lk.likes ?? 0;
    if ((lk.likes ?? 0) >= ECONOMY.REPLY_ENGAGEMENT_THRESHOLD) {
      const amt = ECONOMY.REPLY_ENGAGEMENT_BONUS;
      try {
        await creditWalletHex(rec.wallet, amt, {
          kind: "manual",
          note: `Reply engagement · ${lk.likes} likes · +${amt} ⬡`,
        }, { farmable: true });
        rec.bonusPaid = amt;
        paid++;
        totalBonusHex += amt;
      } catch {/* non-fatal — leave bonusPaid=0, will retry next tick */}
    }
    await updateReply(rec);
    await clearPendingScan(id);
  }

  return { scanned, paid, totalBonusHex };
}
