/**
 * <CityTerminal /> — Bloomberg-style live state panel.
 *
 * The user feedback: "Bloomberg Terminal for a digital civilization."
 * Every screen should answer: "What is happening RIGHT NOW in the city?"
 *
 * Reads (in parallel) OpenSea floor/24h, hex index, collapse state,
 * defender stats, civ leader, last sale. Renders 6 dense panels via
 * the shared <Panel /> primitive — no inline styles, no hardcoded
 * state colors.
 */
import { getCollapseState } from "@/lib/collapse-mode";
import { getStats as getDefenderStats } from "@/lib/defender-store";
import { getUsdPerEth } from "@/lib/eth-price";
import { Panel, ResponsiveGrid, SectionHeader } from "@/components/ui";

const COLLECTION_SLUG = "freelons";

type OsStats = {
  total?: { floor_price?: number; num_owners?: number; sales?: number; volume?: number };
  intervals?: Array<{ interval: string; volume?: number; sales?: number }>;
};

type CivVolume = {
  civs: Array<{ slug: string; name: string; color: string; volEth: number; sales: number; population: number }>;
};

async function fetchOs(): Promise<OsStats | null> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(
      `https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}/stats`,
      { headers: { "X-API-KEY": apiKey, accept: "application/json" }, next: { revalidate: 120 } },
    );
    if (!r.ok) return null;
    return (await r.json()) as OsStats;
  } catch { return null; }
}

async function fetchHexIndex(): Promise<{ floor: number; change24h: number | null } | null> {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  try {
    const r = await fetch(`${base}/api/hex-index`, { cache: "no-store" });
    if (!r.ok) return null;
    const d = (await r.json()) as { floor?: number; change24h?: number | null };
    return { floor: Number(d.floor || 0), change24h: d.change24h == null ? null : Number(d.change24h) };
  } catch { return null; }
}

async function fetchCivLeader(): Promise<CivVolume | null> {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  try {
    const r = await fetch(`${base}/api/opensea/per-civ-volume`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    return (await r.json()) as CivVolume;
  } catch { return null; }
}

async function fetchLastSale(): Promise<{ tokenId: number; priceEth: string | null; buyer: string | null; ts: number | null } | null> {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  try {
    const r = await fetch(`${base}/api/opensea/recent`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const d = (await r.json()) as { events?: Array<{ tokenId?: number; priceEth?: string | null; buyer?: string | null; ts?: number | null }> };
    const e = (d.events || [])[0];
    if (!e?.tokenId) return null;
    return { tokenId: e.tokenId, priceEth: e.priceEth ?? null, buyer: e.buyer ?? null, ts: e.ts ?? null };
  } catch { return null; }
}

function fmtEth(n: number | null | undefined, digits = 3): string {
  if (n == null || !isFinite(n) || n === 0) return "—";
  return `${n.toFixed(digits)} Ξ`;
}
function fmtInt(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}
function fmtAgo(tsSec: number | null | undefined): string {
  if (!tsSec) return "—";
  const sec = Math.floor(Date.now() / 1000 - tsSec);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export async function CityTerminal() {
  const [os, hex, civs, lastSale, collapse, defenders, usdPerEth] = await Promise.all([
    fetchOs(),
    fetchHexIndex(),
    fetchCivLeader(),
    fetchLastSale(),
    getCollapseState(),
    getDefenderStats(),
    getUsdPerEth(),
  ]);

  const floor = Number(os?.total?.floor_price || hex?.floor || 0);
  const floorUsd = floor > 0 ? floor * usdPerEth : 0;
  const oneDay = os?.intervals?.find((i) => i.interval === "one_day");
  const sevenDay = os?.intervals?.find((i) => i.interval === "seven_day");

  const civLeader = (civs?.civs || [])
    .filter((c) => c.volEth > 0 || c.sales > 0)
    .sort((a, b) => b.volEth - a.volEth)[0] || null;

  const cityState: "warning" | "active" = collapse.active ? "warning" : "active";
  const cityLabel = collapse.active ? "STATUS · COLLAPSE" : "STATUS · ACTIVE";

  return (
    <section
      aria-label="City state terminal"
      style={{ maxWidth: "var(--maxw)", margin: "var(--s-4) auto", padding: "0 var(--pad)" }}
    >
      <SectionHeader
        label="STATE OF THE CITY · LIVE"
        live
        liveState={cityState}
        liveLabel={cityLabel}
      />

      <ResponsiveGrid cols={3} colsMd={2}>
        {/* FLOOR + MARKET */}
        <Panel
          state={floor > 0 ? "active" : "offline"}
          label="Floor"
          primary={fmtEth(floor, 4)}
          secondary={floor > 0 ? `≈ $${floorUsd < 100 ? floorUsd.toFixed(2) : Math.round(floorUsd)}` : "—"}
          rows={[
            ["24h vol", fmtEth(oneDay?.volume, 3)],
            ["24h sales", fmtInt(oneDay?.sales)],
            ["7d vol", fmtEth(sevenDay?.volume, 2)],
            ["Holders", fmtInt(os?.total?.num_owners)],
          ]}
          href="https://opensea.io/collection/freelons"
          external
        />

        {/* HEX INDEX */}
        <Panel
          state={hex?.change24h != null && hex.change24h < -10 ? "warning" : "active"}
          label="Hex Index"
          primary={hex?.change24h != null ? `${hex.change24h > 0 ? "+" : ""}${hex.change24h.toFixed(1)}%` : "—"}
          primaryColor={
            hex?.change24h != null
              ? hex.change24h >= 0 ? "var(--state-active)" : "var(--state-warning)"
              : undefined
          }
          secondary="24h change"
          rows={[
            ["Floor", fmtEth(floor, 4)],
            ["Direction", hex?.change24h != null ? (hex.change24h >= 0 ? "▲ rising" : "▼ falling") : "—"],
          ]}
          href="/numbers"
        />

        {/* CIV LEADER */}
        <Panel
          state="active"
          label="Civ Leader · 24h"
          primary={civLeader?.name?.toUpperCase() || "—"}
          primaryColor={civLeader?.color}
          secondary={civLeader ? `${fmtEth(civLeader.volEth, 3)} · ${civLeader.sales} sales` : "no sales yet"}
          rows={civLeader ? [
            ["Population", fmtInt(civLeader.population)],
            ["Slug", civLeader.slug],
          ] : []}
          href={civLeader ? `/civilizations/${civLeader.slug}` : "/civ-wars"}
        />

        {/* DEFENDERS */}
        <Panel
          state={defenders.totalBids > 0 ? "surge" : "active"}
          label="Hold the Line"
          primary={defenders.totalBids.toLocaleString()}
          secondary={`${defenders.totalDefenders} defender${defenders.totalDefenders === 1 ? "" : "s"}`}
          rows={[
            ["Hex paid", `${defenders.hexCredited.toLocaleString()} ⬡`],
            ["Threshold", floor > 0 ? fmtEth(floor * 1.4, 4) : "—"],
            ["Reward", "+500 ⬡"],
          ]}
          href="/hold-the-line"
          cta="DEFEND"
        />

        {/* LAST SALE */}
        <Panel
          state={lastSale ? "active" : "offline"}
          label="Last Sale"
          primary={lastSale ? `#${lastSale.tokenId.toString().padStart(4, "0")}` : "—"}
          secondary={lastSale ? `${lastSale.priceEth ?? "—"} Ξ · ${fmtAgo(lastSale.ts)} ago` : "no recent sale"}
          rows={lastSale?.buyer ? [
            ["Buyer", `${lastSale.buyer.slice(0, 6)}…${lastSale.buyer.slice(-4)}`],
          ] : []}
          href={lastSale ? `/citizens/${lastSale.tokenId}` : "/citizens"}
        />

        {/* DAILY SIGNAL */}
        <Panel
          state="active"
          label="Today's Signal"
          primary="04:04 UTC"
          secondary="daily transmission"
          rows={[
            ["Claim reward", "+10 ⬡"],
            ["Streak max", "+500 ⬡ (30d)"],
          ]}
          href="/daily"
          cta="CLAIM"
        />
      </ResponsiveGrid>
    </section>
  );
}
