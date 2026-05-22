import type { Metadata } from "next";
import Link from "next/link";
import { getDailySignal, dayKey } from "@/lib/daily-signal";
import { CIVILIZATIONS } from "@/lib/constants";

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

// Render fresh per request so the day rolls without redeploy.
export const dynamic = "force-dynamic";

export default function DailyPage() {
  const signal = getDailySignal();
  const civ = CIVILIZATIONS[signal.from];
  const d = dayKey();

  return (
    <main className="manifesto">
      <section className="manifesto-hero">
        <span className="kicker">⬡ FREELON CITY · DAILY TRANSMISSION · DAY {d}</span>
        <h1>
          The city <em>pays</em> the carriers.
        </h1>
        <p className="lead">
          Every UTC day, anyone who carries the signal earns +10 ⬡.
          Hold a citizen to compound. Streaks pay extra.
        </p>
      </section>

      <section
        className="verses"
        style={{ display: "grid", gap: 0, maxWidth: 760, margin: "0 auto" }}
      >
        <article
          className="verse"
          style={{
            borderLeft: `2px solid ${civ.color}`,
            padding: "28px 28px 28px 28px",
            background: "var(--bg-2)",
          }}
        >
          <div
            className="n"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.28em",
              color: civ.color,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            {civ.stamp} · {civ.name} · {civ.doctrine}
          </div>
          <blockquote
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(22px, 2.6vw, 30px)",
              lineHeight: 1.25,
              color: "var(--ink)",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            &ldquo;{signal.line}&rdquo;
          </blockquote>
          {signal.cipher ? (
            <div
              style={{
                marginTop: 18,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.24em",
                color: "var(--ink-fade)",
              }}
            >
              CIPHER · {signal.cipher}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 14,
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
            }}
          >
            CHANT · {civ.chant}
          </div>
        </article>
      </section>

      <section
        className="manifesto-cta"
        style={{ marginTop: 64, flexDirection: "column", alignItems: "center", gap: 18 }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.28em",
            color: "var(--gold)",
            textTransform: "uppercase",
          }}
        >
          ⬡ NEXT SIGNAL · 04:04 UTC
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/carrier">
            <span className="ttl">CLAIM YOUR DAILY SIGNAL →</span>
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
