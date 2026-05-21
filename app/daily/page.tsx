import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Daily Transmission · +10 ⬡ for carrying the signal",
  description:
    "Every day, anyone who carries the FREELON CITY signal earns +10 hex. Holders compound. Streaks pay extra. Join the city.",
  openGraph: {
    title: "I claimed +10 HEX from FREELON CITY",
    description: "The city pays anyone who carries the signal. Hold a citizen to compound.",
    images: [{ url: "/api/og/daily", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "I claimed +10 HEX from FREELON CITY",
    description: "The city pays anyone who carries the signal.",
    images: ["/api/og/daily"],
  },
};

export default function DailyPage() {
  return (
    <main className="daily-page">
      <section className="daily-hero">
        <span className="kicker">⬡ FREELON CITY · DAILY TRANSMISSION</span>
        <h1>
          The city <em>pays</em> the carriers.
        </h1>
        <p className="lead">
          Every UTC day, anyone who carries the signal earns +10 ⬡.
          Hold a citizen to compound. Streaks pay extra.
        </p>
        <div className="daily-cta">
          <Link className="btn btn-primary" href="/carrier">
            <span className="ttl">SYNC A CARRIER →</span>
          </Link>
          <Link className="btn btn-secondary" href="/citizens">
            <span className="ttl">OWN A CITIZEN ↗</span>
          </Link>
          <Link className="btn btn-ghost" href="/lore">
            <span className="ttl">READ THE LORE</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
