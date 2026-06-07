import type { Metadata } from "next";
import Link from "next/link";
import { CivValueChart } from "@/components/CivValueChart";
import { HexNetWorth } from "@/components/HexNetWorth";
import { HexIndex } from "@/components/HexIndex";
import { CityStats } from "@/components/CityStats";
import { LiveSalesFeed } from "@/components/LiveSalesFeed";
import { RedSignalsFeed } from "@/components/RedSignalsFeed";
import { LiveHeatGrid } from "@/components/LiveHeatGrid";
import { HolderDistributionChart } from "@/components/HolderDistributionChart";
import { CityFeedTicker } from "@/components/CityFeedTicker";
import { TopCitizensByValue } from "@/components/TopCitizensByValue";
import { HeatSection } from "@/components/dashboard/HeatSection";
import { SnipesSection } from "@/components/dashboard/SnipesSection";
import { CivWarSection } from "@/components/dashboard/CivWarSection";
import { EarnersSection } from "@/components/dashboard/EarnersSection";
import { ProgressionSection } from "@/components/dashboard/ProgressionSection";
import { CONTRACT, TOTAL } from "@/lib/constants";
import { listWalletHexRecords } from "@/lib/wallet-hex-store";

// Folded /numbers, /heat, /undervalued, /civ-wars, /leaderboard into this
// hub (2026-05-31). Sections refetch at their own cadence; keep the page
// fresh on a 2-min window — the tightest of the folded pages.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Dashboard · Pulse",
  description:
    "Live city economy in one place. Hex Index, floor by civilization, holder distribution, trait heat, snipe board, civ wars, top earners.",
  openGraph: { images: [{ url: "/api/og/hex-index", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/api/og/hex-index"] },
};

const SITE = "https://www.freeloncity.com";
const tweetUrl = (text: string) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${SITE}/dashboard\n\n#FreelonCity #404HEXNOTFOUND`,
  )}`;

function fmtInt(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

const SUBNAV: Array<{ id: string; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "heat", label: "Heat" },
  { id: "snipes", label: "Snipes" },
  { id: "civ-war", label: "Civ War" },
  { id: "earners", label: "Earners" },
  { id: "progression", label: "Citizens" },
];

export default async function Dashboard() {
  // Hex receipts folded from /numbers — surfaced inside the overview so the
  // dashboard answers "how much hex is live / burned across all wallets".
  const hexRecords = await listWalletHexRecords(500).catch(() => []);
  const hexBalanceTotal = hexRecords.reduce((a, r) => a + (r.balance || 0), 0);
  const hexLifetimeTotal = hexRecords.reduce((a, r) => a + (r.lifetimeEarned || 0), 0);
  const hexBurnedTotal = Math.max(0, hexLifetimeTotal - hexBalanceTotal);
  const trackedWallets = hexRecords.length;
  const activeWallets = hexRecords.filter((r) => (r.balance || 0) > 0).length;
  const carriersWithClaimStreak = hexRecords.filter((r) => (r.claimStreak ?? 0) > 0).length;

  return (
    <div className="dashboard-page">
      <CityFeedTicker />
      <section className="dashboard-hero">
        <span className="kicker">⬡ PULSE · LIVE FROM THE CITY</span>
        <h1>The city&apos;s <em>live numbers</em></h1>
        <p className="lead">
          Live stats for the collection — floor price, who holds what, and how ⬡
          moves through the city. For holders who want the data; if you&apos;re new,{" "}
          <Link href="/citizens/1" style={{ color: "var(--gold)" }}>see an agent first</Link>.
        </p>
      </section>

      {/* Sticky in-page sub-nav — pure anchor links, SSR-friendly. */}
      <nav className="dash-subnav" aria-label="Dashboard sections">
        {SUBNAV.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="dash-subnav__link">
            {s.label}
          </a>
        ))}
      </nav>

      {/* ── OVERVIEW (existing live economy dashboard + folded /numbers receipts) ── */}
      <section id="overview" style={{ scrollMarginTop: 96 }}>
        {/* Row 1 — HOLDER NUMBERS FIRST (Phase 3 directive).
            Investor question #1 is "who owns this collection?". Lead
            with the holder map + per-civ value cap before any generic
            floor / index stats. */}
        <div className="dash-grid dash-grid-2">
          <HolderDistributionChart />
          <CivValueChart />
        </div>

        {/* Row 2 — Your wallet stake in the city (when present). */}
        <div className="dash-grid">
          <HexNetWorth />
        </div>

        {/* Row 3 — generic city stats below the holder + civ context. */}
        <div className="dash-grid dash-grid-2">
          <CityStats />
          <HexIndex />
        </div>

        {/* 2026-06-07 density (dashboard scored 4/10 — densest page): the
            Overview led with 10 stacked widgets. The focal reads (holder map,
            civ value, your stake, city stats, hex index) stay open above; the
            receipts grid + the four feeds below fold into one tap so the page
            opens as a scannable summary, not a wall. The dedicated #heat /
            #snipes / #earners sections below still carry the full detail. */}
        <details className="collector-details" style={{ marginTop: "var(--s-4)" }}>
          <summary className="collector-summary">Full economy breakdown · receipts, top citizens, red signals, sales</summary>

        {/* City receipts — hex aggregates folded from /numbers. */}
        <div className="dash-receipts">
          <span className="kicker">⬡ CITY RECEIPTS · HEX ECONOMY</span>
          <div className="dash-receipts__grid">
            <Stat label="Hex in circulation" value={`${fmtInt(hexBalanceTotal)} ⬡`} sub="sum of all wallet balances" />
            <Stat label="Hex burned (lifetime)" value={`${fmtInt(hexBurnedTotal)} ⬡`} sub="all sinks · tithes, names, realigns, transmissions, boosts" />
            <Stat label="Tracked wallets" value={fmtInt(trackedWallets)} sub={`${fmtInt(activeWallets)} active · hex > 0`} />
            <Stat label="Daily-claim streakers" value={fmtInt(carriersWithClaimStreak)} sub="wallets with an unbroken claim streak" />
            <Stat label="Supply" value={`${TOTAL.toLocaleString()} citizens`} sub="hard-capped · no mint left" />
            <Stat
              label="Contract"
              value={<code style={{ fontSize: 12, wordBreak: "break-all", overflowWrap: "anywhere", display: "block", lineHeight: 1.4 }}>{CONTRACT}</code>}
              sub="Ethereum mainnet · ERC-721"
            />
          </div>
        </div>

        {/* Per-citizen value ranking. */}
        <TopCitizensByValue />

        {/* Red Signals — undervalued listings worth sniping for hex bounties */}
        <RedSignalsFeed />

        {/* Live Heat Grid — per-civ activity pulse */}
        <LiveHeatGrid />

        {/* Live sales feed */}
        <div className="dash-grid">
          <LiveSalesFeed />
        </div>
        </details>
      </section>

      {/* ── HEAT ← app/heat ── */}
      <HeatSection />

      {/* ── SNIPES ← app/undervalued ── */}
      <SnipesSection />

      {/* ── CIV WAR ← app/civ-wars ── */}
      <CivWarSection />

      {/* ── EARNERS ← app/leaderboard ── */}
      <EarnersSection />

      {/* ── CITIZEN PROGRESSION ── */}
      <ProgressionSection />

      <section className="dash-share">
        <span className="kicker">⬡ SHARE THE CITY</span>
        <div className="ui-cta-row dash-share-row">
          <a href={tweetUrl("HEX INDEX — live signal of FREELON CITY:")} target="_blank" rel="noreferrer" className="btn btn-primary">
            <span className="ttl">SHARE HEX INDEX <span className="ar">↗</span></span>
          </a>
          <a href={tweetUrl("Civ-by-civ floor cap of FREELON CITY:")} target="_blank" rel="noreferrer" className="btn btn-secondary">
            <span className="ttl">SHARE CIV VALUE <span className="ar">↗</span></span>
          </a>
          <a href={tweetUrl("Holder map of FREELON CITY:")} target="_blank" rel="noreferrer" className="btn btn-ghost">
            <span className="ttl">SHARE HOLDERS <span className="ar">↗</span></span>
          </a>
        </div>
      </section>

      <section className="dash-next">
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="ui-cta-row dash-next-row">
          <a
            className="btn btn-primary"
            href="https://opensea.io/assets/ethereum/0xa79e73c9828db3fcd7c77be7d9f356fb684b5504"
            target="_blank"
            rel="noreferrer"
          >
            <span className="ttl">GET A FREELON <span className="ar">↗</span></span>
          </a>
          <Link className="btn btn-secondary" href="/earn">
            <span className="ttl">THE LEDGER →</span>
          </Link>
          <Link className="btn btn-secondary" href="/civilizations">
            <span className="ttl">PICK YOUR CIV →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Local components (Stat card — mirrors the /numbers receipt cards)
// ─────────────────────────────────────────────────────────────────────

function Stat({
  label, value, sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div
      style={{
        padding: "var(--s-3) var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 96,
      }}
    >
      <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--display)", fontSize: "clamp(22px, 2.5vw, 30px)", lineHeight: 1.1, color: "var(--ink)", letterSpacing: "-0.005em" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
