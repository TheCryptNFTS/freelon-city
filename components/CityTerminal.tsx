/**
 * <CityTerminal /> — Bloomberg-style live state panel.
 *
 * The user feedback: "Bloomberg Terminal for a digital civilization."
 * Every screen should answer: "What is happening RIGHT NOW in the city?"
 *
 * This is the first surface to actually embody that. Server component,
 * reads in parallel:
 *   - OpenSea floor + 24h volume / sales
 *   - Hex-index (live + 24h delta)
 *   - Collapse state
 *   - Defender stats (bids placed / defenders / hex distributed)
 *   - Top civilization by sales volume
 *   - Last sale
 *
 * Layout: 6 dense panels in a CSS grid that collapses to vertical on
 * mobile. Each panel has a "system state" (active/unstable/warning/
 * surge) reflected by left-edge color + tiny pulse dot.
 *
 * Typography: small terse tabular numerics in mono, headline numbers
 * in display. Sparse padding + dense data per panel = the density
 * contrast the brief asked for.
 *
 * No emojis. No gradient bloat. Reference: Bloomberg, Dune UI restraint.
 */
import Link from "next/link";
import { getCollapseState } from "@/lib/collapse-mode";
import { getStats as getDefenderStats } from "@/lib/defender-store";
import { getUsdPerEth } from "@/lib/eth-price";

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

  // Civ leader by 24h then lifetime volume
  const civLeader = (civs?.civs || [])
    .filter((c) => c.volEth > 0 || c.sales > 0)
    .sort((a, b) => b.volEth - a.volEth)[0] || null;

  // Determine system state
  const collapseState: "active" | "unstable" | "warning" | "surge" = collapse.active ? "warning" : "active";

  return (
    <section
      aria-label="City state terminal"
      style={{
        maxWidth: "var(--maxw)",
        margin: "var(--s-4) auto",
        padding: "0 var(--pad)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
          fontFamily: "var(--mono2)",
          fontSize: 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
        }}
      >
        <span>STATE OF THE CITY · LIVE</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: collapse.active ? "#FF8A6E" : "#7AE08D", boxShadow: `0 0 8px ${collapse.active ? "#FF8A6E" : "#7AE08D"}` }} />
          {collapse.active ? `STATUS · COLLAPSE` : `STATUS · ${collapseState.toUpperCase()}`}
        </span>
      </header>

      <div className="city-terminal-grid">
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
          primaryColor={hex?.change24h != null ? (hex.change24h >= 0 ? "#7AE08D" : "#FF8A6E") : undefined}
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
      </div>

      <style>{`
        .city-terminal-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: var(--line);
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
        }
        @media (max-width: 920px) {
          .city-terminal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 540px) {
          .city-terminal-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}

type PanelState = "active" | "unstable" | "warning" | "offline" | "surge";

function stateBorder(s: PanelState): string {
  switch (s) {
    case "surge":   return "#E8B247";
    case "warning": return "#FF8A6E";
    case "unstable":return "#FFD27A";
    case "offline": return "#3a3a3a";
    case "active":
    default:        return "#7AE08D";
  }
}

function Panel({
  state, label, primary, primaryColor, secondary, rows, href, cta, external,
}: {
  state: PanelState;
  label: string;
  primary: React.ReactNode;
  primaryColor?: string;
  secondary?: string;
  rows?: Array<[string, string]>;
  href?: string;
  cta?: string;
  external?: boolean;
}) {
  const stateColor = stateBorder(state);
  const inner = (
    <article
      style={{
        background: "rgba(8,10,14,0.95)",
        padding: "14px 16px 12px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 168,
        transition: "background 140ms ease",
      }}
      className="city-terminal-panel"
    >
      {/* state strip */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: 3, background: stateColor,
          opacity: state === "offline" ? 0.4 : 1,
        }}
      />

      {/* header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--ink-dim)" }}>
          {label}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--mono2)", fontSize: 8, letterSpacing: "0.22em", color: stateColor, textTransform: "uppercase" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: stateColor, boxShadow: state !== "offline" ? `0 0 6px ${stateColor}` : "none" }} />
          {state}
        </span>
      </div>

      {/* primary */}
      <div style={{ fontFamily: "var(--display)", fontSize: "clamp(22px, 2.4vw, 30px)", letterSpacing: "-0.005em", lineHeight: 1.05, color: primaryColor || "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
        {primary}
      </div>
      {secondary && (
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", letterSpacing: "0.06em" }}>
          {secondary}
        </div>
      )}

      {/* row grid */}
      {rows && rows.length > 0 && (
        <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr auto", gap: "2px 12px", fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", lineHeight: 1.5 }}>
          {rows.map(([k, v], i) => (
            <>
              <span key={`k${i}`} style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{k}</span>
              <span key={`v${i}`} style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{v}</span>
            </>
          ))}
        </div>
      )}

      {/* cta hint */}
      {cta && (
        <span style={{ position: "absolute", bottom: 10, right: 14, fontFamily: "var(--mono2)", fontSize: 9, letterSpacing: "0.26em", color: stateColor, textTransform: "uppercase" }}>
          {cta} →
        </span>
      )}
    </article>
  );
  if (!href) return inner;
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>{inner}</a>
  ) : (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>{inner}</Link>
  );
}
