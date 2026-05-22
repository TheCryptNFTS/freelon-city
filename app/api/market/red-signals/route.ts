import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { CONTRACT } from "@/lib/constants";
import { ECONOMY } from "@/lib/economy-constants";
import {
  isRedSignal,
  setRedSignal,
  snipeBounty,
  type RedSignal,
} from "@/lib/red-signal-store";
import { getWatchersOfToken, isPrivateWindow } from "@/lib/watchlist-store";

export const revalidate = 300; // 5 min — listings churn but we don't need tighter

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

export async function GET(req: Request) {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return NextResponse.json({ signals: [], floor: 0 });

  const floor = await fetchFloor(apiKey);
  if (floor <= 0) return NextResponse.json({ signals: [], floor: 0 });

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
    const viewerAddr = (new URL(req.url).searchParams.get("viewer") || "").toLowerCase();
    for (const l of d.listings || []) {
      // Token id from offer[0].identifierOrCriteria
      const offer = l.protocol_data?.parameters?.offer || [];
      const idStr = offer[0]?.identifierOrCriteria;
      const tokenId = idStr ? Number(idStr) : NaN;
      if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) continue;

      // Price in wei. v2 listings API returns current_price as wei string.
      const wei = l.current_price || l.price?.current?.value;
      if (!wei) continue;
      const decimals = l.price?.current?.decimals ?? 18;
      const eth = Number(BigInt(wei)) / 10 ** decimals;
      if (!isRedSignal(eth, floor)) continue;

      const seller = (l.protocol_data?.parameters?.offerer || l.maker?.address || "").toLowerCase();
      const rs: RedSignal = {
        tokenId,
        priceEth: eth,
        floorEth: floor,
        seller,
        flaggedAt: Date.now(),
      };
      // Persist (non-blocking; failures don't fail the response)
      void setRedSignal(rs).catch(() => {});

      // Watchlist private window: if any wallet is watching this token AND
      // the signal is still inside its 24h private window, hide it from the
      // public feed unless the viewer is one of the watchers.
      const watchers = await getWatchersOfToken(tokenId);
      const privateNow = watchers.length > 0 && isPrivateWindow(rs.flaggedAt);
      if (privateNow && !watchers.includes(viewerAddr)) continue;
      const privateUntil = privateNow ? rs.flaggedAt + 24 * 60 * 60 * 1000 : undefined;

      out.push({ ...rs, bountyHex: snipeBounty(rs), privateUntil });
    }

    // Sort by best deal (biggest discount first)
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
