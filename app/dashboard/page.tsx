import type { Metadata } from "next";
import { CivValueChart } from "@/components/CivValueChart";
import { HexNetWorth } from "@/components/HexNetWorth";

export const metadata: Metadata = {
  title: "Dashboard · Civ value + Hex Net Worth · FREELON CITY",
  description: "Per-civilization collection value, your Hex Net Worth, the city's economic state.",
  openGraph: { images: [{ url: "/api/og/hex-index", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/api/og/hex-index"] },
};

const SITE = "https://freeloncity.com";

function tweetUrl(text: string, url: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${url}\n\n#FreelonCity #404HEXNOTFOUND`
  )}`;
}

export default function Dashboard() {
  const hexIndexShare = tweetUrl(
    "The HEX INDEX · total value of FREELON CITY:",
    `${SITE}/dashboard`
  );
  const civValueShare = tweetUrl(
    "Civilization-by-civilization value of FREELON CITY:",
    `${SITE}/dashboard`
  );
  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <span className="kicker">⬡ FREELON CITY · ECONOMIC LAYER</span>
        <h1>The <em>numbers.</em></h1>
        <p className="lead">Live floor × civilization population × your holdings. The city, valued.</p>
        <div className="dashboard-share">
          <a
            href={hexIndexShare}
            target="_blank"
            rel="noreferrer"
            className="btn btn-gold dashboard-share-btn"
          >
            <span className="lbl">SHARE</span>
            <span className="ttl">HEX INDEX <span className="ar">↗</span></span>
          </a>
          <a
            href={civValueShare}
            target="_blank"
            rel="noreferrer"
            className="btn dashboard-share-btn"
          >
            <span className="lbl">SHARE</span>
            <span className="ttl">CIV VALUE <span className="ar">↗</span></span>
          </a>
        </div>
      </section>
      <HexNetWorth />
      <CivValueChart />
    </main>
  );
}
