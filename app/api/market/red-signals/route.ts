import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { ECONOMY } from "@/lib/economy-constants";
import {
  isRedSignal,
  getRedSignal,
  setRedSignal,
  snipeBounty,
  type RedSignal,
} from "@/lib/red-signal-store";
import { getWatchersOfToken, isPrivateWindow } from "@/lib/watchlist-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { verifySession, X_SESSION_COOKIE } from "@/lib/x-session";

export const revalidate = 300;

type Listing = {
  protocol_data?: {
    parameters?: {
      offer?: Array<{ identifierOrCriteria?: string }>;
      offerer?: string;
    };
  };
  current_price?: string;
  price?: { current?: { value?: string; decimals?: number } };
  maker?: { address?: string };
};

type ListingsResp = { listings?: Listing[] };

async function fetchFloor(apiKey: string): Promise<number> {
  const r = await fetchWithTimeout(
    "https://api.opensea.io/api/v2/collections/freelons/stats",
    { headers: { "X-API-KEY": apiKey }, next: { revalidate: 300 }, timeoutMs: 4000 },
  ).catch(() => null);
  if (!r || !r.ok) return 0;
  const d = await r.json();
  return Number(d?.total?.floor_price || 0);
}

/**
 * Resolve viewer address from the X session cookie (HMAC-signed bind).
 * Falls back to no-viewer if the session is missing or the bind isn't a
 * wallet address. Rejects spoofed ?viewer= query params — only the
 * server's signed cookie counts. Closes the watchlist-enumeration leak.
 */
function resolveViewer(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`(?:^|; )${X_SESSION_COOKIE}=([^;]+)`));
  if (!m) return null;
  const session = verifySession(decodeURIComponent(m[1]));
  if (!session) return null;
  const bind = (session.bind || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(bind)) return null;
  return bind;
}

export async function GET(req: Request) {
  // Hard rate limit: this endpoint hits OpenSea and Upstash on every call.
  // Without this, an attacker could exhaust the OpenSea quota in minutes.
  const rl = await limit(req, "market:red-signals", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return NextResponse.json({ signals: [], floor: 0 });

  const floor = await fetchFloor(apiKey);
  if (floor <= 0) return NextResponse.json({ signals: [], floor: 0 });

  const viewer = resolveViewer(req);

  try {
    const url = `https://api.opensea.io/api/v2/listings/collection/freelons/all?limit=50`;
    const r = await fetchWithTimeout(url, {
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      next: { revalidate: 300 },
      timeoutMs: 6000,
    });
    if (!r.ok) return NextResponse.json({ signals: [], floor });
    const d = (await r.json()) as ListingsResp;

    const out: Array<RedSignal & { bountyHex: number; privateUntil?: number }> = [];
    for (const l of d.listings || []) {
      const offer = l.protocol_data?.parameters?.offer || [];
      const idStr = offer[0]?.identifierOrCriteria;
      const tokenId = idStr ? Number(idStr) : NaN;
      if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) continue;

      const wei = l.current_price || l.price?.current?.value;
      if (!wei) continue;
      const decimals = l.price?.current?.decimals ?? 18;
      const { weiToEth } = await import("@/lib/eth-math");
      const eth = weiToEth(wei, decimals);
      if (!isRedSignal(eth, floor)) continue;

      const seller = (l.protocol_data?.parameters?.offerer || l.maker?.address || "").toLowerCase();

      // Check if this signal already exists for this token. If so, reuse the
      // original flaggedAt + watchersAtFlag so subsequent watchers can't
      // extend the private window. If not, create a fresh entry with a
      // frozen snapshot of who was watching at this moment.
      const existing = await getRedSignal(tokenId);
      const isNewFlag = !existing || existing.priceEth !== eth;
      let rs: RedSignal;
      if (isNewFlag) {
        const watchers = await getWatchersOfToken(tokenId);
        rs = {
          tokenId,
          priceEth: eth,
          floorEth: floor,
          seller,
          flaggedAt: Date.now(),
          watchersAtFlag: watchers,
        };
        void setRedSignal(rs).catch(() => {});
        // Bump heat counter (cosmetic — heat panel uses these)
        try {
          const { bumpHeat } = await import("@/lib/heat-counters");
          const citizens = (await import("@/data/citizens.json")).default as Array<{ id: number; civilization: string }>;
          const civSlug = citizens.find((c) => c.id === tokenId)?.civilization;
          if (civSlug) await bumpHeat(civSlug, "signal");
        } catch { /* non-blocking */ }
      } else {
        rs = existing!;
      }

      // Private window: only watchers FROZEN at flag time qualify. Watchers
      // added later don't get to peek inside this 24h window.
      const watchersAtFlag = rs.watchersAtFlag || [];
      const privateNow = watchersAtFlag.length > 0 && isPrivateWindow(rs.flaggedAt);
      if (privateNow && (!viewer || !watchersAtFlag.includes(viewer))) continue;
      const privateUntil = privateNow ? rs.flaggedAt + 24 * 60 * 60 * 1000 : undefined;

      out.push({ ...rs, bountyHex: snipeBounty(rs), privateUntil });

      // ── GHOST detection (display-layer dump deterrent) ──────────
      // If the listing is at or below the dump threshold, ensure a
      // ghost record exists. The grace period decides when the city
      // visibly flips the citizen to SIGNAL LOST.
      //
      // When grace elapses while the listing is still active, break
      // the seller's defender streak (idempotent via defenderBroken
      // flag). This makes the streak break on graduation, not just on
      // sale — so a dumper who delists after grace has already paid
      // the streak cost.
      try {
        const discount = floor > 0 ? (floor - eth) / floor : 0;
        if (discount >= 1 - ECONOMY.DUMP_THRESHOLD) {
          const { getGhost, setGhost, breakDefenderStreak } = await import("@/lib/ghost-store");
          const existingGhost = await getGhost(tokenId);
          const now = Date.now();
          const graceMs = ECONOMY.GHOST_GRACE_HOURS * 3_600_000;
          if (!existingGhost) {
            await setGhost({
              tokenId, seller, priceEth: eth, floorEth: floor, discount,
              firstSeenAt: now, ghostedAt: now + graceMs, status: "ghosted",
              defenderBroken: false,
            });
          } else if (existingGhost.status === "ghosted") {
            // already known — refresh price/floor in case it moved
            existingGhost.priceEth = eth;
            existingGhost.floorEth = floor;
            existingGhost.discount = discount;
            // Graduation: grace has elapsed and we haven't broken the
            // dumper's streak yet → do it now, mark flag so repeated scans
            // don't keep calling the breaker.
            if (now >= existingGhost.ghostedAt && !existingGhost.defenderBroken) {
              try { await breakDefenderStreak(existingGhost.seller); } catch {}
              existingGhost.defenderBroken = true;
            }
            await setGhost(existingGhost);
          }
        }
      } catch { /* ghost detection is non-blocking */ }
    }

    out.sort((a, b) => (b.floorEth - b.priceEth) - (a.floorEth - a.priceEth));

    return NextResponse.json({
      signals: out.slice(0, 20),
      floor,
      threshold: ECONOMY.RED_SIGNAL_THRESHOLD,
      bountyCap: ECONOMY.SNIPE_BOUNTY_CAP,
      holdDays: ECONOMY.SNIPE_HOLD_DAYS,
    });
  } catch {
    return NextResponse.json({ signals: [], floor });
  }
}
