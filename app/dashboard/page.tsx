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

export const metadata: Metadata = {
  title: "Dashboard · Pulse",
  description:
    "Live city economy. Hex Index, floor by civilization, holder distribution, sales feed, your net worth.",
  openGraph: { images: [{ url: "/api/og/hex-index", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/api/og/hex-index"] },
};

const SITE = "https://www.freeloncity.com";
const tweetUrl = (text: string) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${SITE}/dashboard\n\n#FreelonCity #404HEXNOTFOUND`,
  )}`;

export default function Dashboard() {
  return (
    <main className="dashboard-page">
      <CityFeedTicker />
      <section className="dashboard-hero">
        <span className="kicker">⬡ PULSE · LIVE FROM THE CITY</span>
        <h1>The <em>numbers</em></h1>
        <p className="lead">
          The city, in numbers. Floor by civilization, hex accrued, the holder map. Live.
        </p>
      </section>

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

      {/* Per-citizen value ranking. New 2026-05-25 — accumulated hex +
          rarity + sale + hold time → composite score, top 10. Belongs
          here so the dashboard answers "which citizens are the city's
          most valuable" alongside holder + civ-value charts. */}
      <TopCitizensByValue />

      {/* Red Signals — undervalued listings worth sniping for hex bounties */}
      <RedSignalsFeed />

      {/* Live Heat Grid — per-civ activity pulse */}
      <LiveHeatGrid />

      {/* Live sales feed */}
      <div className="dash-grid">
        <LiveSalesFeed />
      </div>

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
          <Link className="btn btn-secondary" href="/leaderboard">
            <span className="ttl">THE LEADERBOARD →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
