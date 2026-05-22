/**
 * Floor defender bonus: +50 hex/day per citizen held continuously for 30+ days.
 *
 * v1 implementation: uses OpenSea transfer events to determine the latest
 * acquisition timestamp for each currently-held token. If `now - acquired ≥ 30d`,
 * the token counts toward the defender total. Catch-up is capped at 30 days
 * to mirror the holder tick.
 *
 * "Not listed" is intentionally NOT required in v1 — that needs a separate
 * listing-history scrape. Reward "loyal" holding (no transfer) for now.
 */

import { CONTRACT } from "@/lib/constants";
import { getWalletTokens } from "@/lib/wallet-tokens";
import {
  creditWalletHex,
  getWalletHex,
  setWalletHex,
  todayUTC,
} from "@/lib/wallet-hex-store";

const PER_TOKEN_PER_DAY = 50;
const MIN_HOLD_MS = 30 * 86400000;
const MAX_CATCHUP_DAYS = 30;
const MAX_EVENT_PAGES = 4;

type TransferEvent = {
  event_type?: string;
  event_timestamp?: number;
  to_address?: string;
  nft?: { identifier?: string };
};

function diffDaysUTC(from: string, to: string): number {
  const f = Date.parse(from + "T00:00:00Z");
  const t = Date.parse(to + "T00:00:00Z");
  if (!isFinite(f) || !isFinite(t)) return 0;
  return Math.max(0, Math.round((t - f) / 86400000));
}

export type DefenderResult = {
  qualifyingTokens: number;
  hexCredited: number;
  daysCredited: number;
};

export async function runFloorDefenderTick(address: string): Promise<DefenderResult> {
  const today = todayUTC();
  const rec = await getWalletHex(address);
  const last = rec.lastDefenderTickDay ?? null;

  // First-ever check: stamp today and don't backfill
  if (!last) {
    rec.lastDefenderTickDay = today;
    await setWalletHex(rec);
    return { qualifyingTokens: 0, hexCredited: 0, daysCredited: 0 };
  }

  let daysDue = diffDaysUTC(last, today);
  if (daysDue <= 0) return { qualifyingTokens: 0, hexCredited: 0, daysCredited: 0 };
  if (daysDue > MAX_CATCHUP_DAYS) daysDue = MAX_CATCHUP_DAYS;

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    // Can't verify holding duration without OpenSea — just advance the cursor
    rec.lastDefenderTickDay = today;
    await setWalletHex(rec);
    return { qualifyingTokens: 0, hexCredited: 0, daysCredited: 0 };
  }

  const tokens = await getWalletTokens(address, 500);
  if (!tokens || tokens.balance === 0) {
    rec.lastDefenderTickDay = today;
    await setWalletHex(rec);
    return { qualifyingTokens: 0, hexCredited: 0, daysCredited: 0 };
  }

  // Walk transfer events to this wallet, find latest acquisition per token
  const latestAcquired = new Map<string, number>();
  let next: string | undefined;
  try {
    for (let p = 0; p < MAX_EVENT_PAGES; p++) {
      const u = new URL(
        `https://api.opensea.io/api/v2/events/accounts/${address}`,
      );
      u.searchParams.set("event_type", "transfer");
      u.searchParams.set("limit", "50");
      if (next) u.searchParams.set("next", next);
      const { fetchWithTimeout } = await import("@/lib/fetch-with-timeout");
      const r = await fetchWithTimeout(u.toString(), {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 600 },
        timeoutMs: 6000,
      }).catch(() => null);
      if (!r || !r.ok) break;
      const d = (await r.json()) as { asset_events?: TransferEvent[]; next?: string };
      for (const ev of d.asset_events || []) {
        if (ev.event_type !== "transfer") continue;
        const id = ev.nft?.identifier;
        const ts = (ev.event_timestamp || 0) * 1000;
        const to = (ev.to_address || "").toLowerCase();
        if (!id || !ts || to !== address.toLowerCase()) continue;
        // Track the LATEST acquisition (transfer-in) for each token
        const cur = latestAcquired.get(id) || 0;
        if (ts > cur) latestAcquired.set(id, ts);
      }
      next = d.next;
      if (!next) break;
    }
  } catch {
    /* fall through */
  }

  const now = Date.now();
  let qualifying = 0;
  for (const tid of tokens.tokenIds) {
    const acquired = latestAcquired.get(String(tid));
    if (!acquired) continue;
    if (now - acquired >= MIN_HOLD_MS) qualifying++;
  }

  const credit = qualifying * PER_TOKEN_PER_DAY * daysDue;
  if (credit > 0) {
    await creditWalletHex(address, credit, {
      kind: "hold",
      note: `Floor defender · ${qualifying} citizen${qualifying === 1 ? "" : "s"} × ${daysDue}d`,
    });
  }

  // Advance cursor
  const after = await getWalletHex(address);
  after.lastDefenderTickDay = today;
  await setWalletHex(after);

  return { qualifyingTokens: qualifying, hexCredited: credit, daysCredited: daysDue };
}
