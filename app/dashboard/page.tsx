import type { Metadata } from "next";
import Link from "next/link";
import { CivValueChart } from "@/components/CivValueChart";
import { HexNetWorth } from "@/components/HexNetWorth";
import { HexIndex } from "@/components/HexIndex";
import { CityStats } from "@/components/CityStats";
import { LiveSalesFeed } from "@/components/LiveSalesFeed";
import { HolderDistributionChart } from "@/components/HolderDistributionChart";

export const metadata: Metadata = {
  title: "Dashboard · Hex Index · Civ Value · Holders · FREELON CITY",
  description:
    "The city, valued. Live Hex Index, per-civilization floor, holder distribution, sales feed, your net worth.",
  openGraph: { images: [{ url: "/api/og/hex-index", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/api/og/hex-index"] },
};

const SITE = "https://freeloncity.com";

function tweetUrl(text: string, url: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${url}\n\n#FreelonCity #404HEXNOTFOUND`,
  )}`;
}

export default function Dashboard() {
  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <span className="kicker">⬡ FREELON CITY · ECONOMIC LAYER</span>
        <h1>
          The <em>numbers</em>
        </h1>
        <p className="lead">
          Live floor × civilization population × your holdings. The city, valued.
        </p>
        <div className="dashboard-share">
          <a
            href={tweetUrl("HEX INDEX — live floor signal of FREELON CITY:", `${SITE}/dashboard`)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary dashboard-share-btn"
          >
            <span className="ttl">SHARE HEX INDEX <span className="ar">↗</span></span>
          </a>
          <a
            href={tweetUrl("Civ-by-civ value of FREELON CITY:", `${SITE}/dashboard`)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary dashboard-share-btn"
          >
            <span className="ttl">SHARE CIV VALUE <span className="ar">↗</span></span>
          </a>
          <a
            href={tweetUrl(
              "Holder distribution of FREELON CITY — the city's diaspora:",
              `${SITE}/dashboard`,
            )}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost dashboard-share-btn"
          >
            <span className="ttl">SHARE HOLDERS <span className="ar">↗</span></span>
          </a>
        </div>
      </section>

      <CityStats />
      <HexIndex />
      <HexNetWorth />
      <CivValueChart />
      <HolderDistributionChart />
      <LiveSalesFeed />

      <section style={{ marginTop: "var(--s-6)", maxWidth: "var(--maxw)", margin: "var(--s-6) auto 0", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <a
            className="btn btn-primary"
            href="https://opensea.io/assets/ethereum/0xa79e73c9828db3fcd7c77be7d9f356fb684b5504"
            target="_blank"
            rel="noreferrer"
          >
            <span className="ttl">GET A FREELON <span className="ar">↗</span></span>
          </a>
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">HOW TO EARN →</span></Link>
          <Link className="btn btn-secondary" href="/leaderboard"><span className="ttl">LEADERBOARD →</span></Link>
        </div>
      </section>
    </main>
  );
}
