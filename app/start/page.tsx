import type { Metadata } from "next";
import Link from "next/link";
import { TrackedLink } from "@/components/TrackedLink";
import { TrackedOpenSeaLink } from "@/components/TrackedOpenSeaLink";
import { OPENSEA_BASE } from "@/lib/constants";

/**
 * /start — lightweight onboarding (2026-07-01 sequencing pass).
 *
 * History: /start was a longer "sales read" that duplicated the homepage hero, so it
 * was folded into /help on 2026-06-17 (permanentRedirect). The 2026-07-01 teardown
 * re-sequenced the whole site around ONE thesis (a citizen that remembers you) and
 * added "Start" back to the nav — but a nav item labelled "Start" 308-ing to /help
 * read as accidental ("Help" = support, "Start" = onboarding). This restores /start
 * as a REAL page, but deliberately NOT the old sales read: it's the short five-step
 * sequence (meet → own → awaken → train → play), same thesis + CTA order as the
 * homepage, no lore dump, no dashboard stats, no heavy Web3 language. /help remains
 * the support/FAQ page; this is the onboarding path that points into it.
 */

const PAGE_DESC =
  "New to FREELON CITY? Start here — meet a citizen free, own one for permanence, awaken it, train it with jobs, and play the city.";
export const metadata: Metadata = {
  title: "Start here — FREELON CITY in five steps",
  description: PAGE_DESC,
  openGraph: {
    title: "Start here — FREELON CITY in five steps",
    description: PAGE_DESC,
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start here — FREELON CITY in five steps",
    description: PAGE_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

const STEPS = [
  {
    label: "Meet a citizen — free",
    body: "Talk to a living AI citizen in the browser. No wallet, no signup — a free taste of what an owned citizen becomes.",
  },
  {
    label: "Own one for permanence",
    body: "Like it? Buy a FREELON on OpenSea. Now the citizen is yours to keep — and everything it becomes travels with the NFT.",
  },
  {
    label: "Awaken it",
    body: "A one-time payment turns its agent on. It wakes up, remembers you from then on, and drops bonus ⬡ in your wallet.",
  },
  {
    label: "Train it with jobs",
    body: "Give it real work — writing, strategy, research, images. It levels up, remembers your project, and builds a work history that stays with the token.",
  },
  {
    label: "Play the city",
    body: "Mars and the Crypt TCG are free experiences in the same world. Extra ways to play — not a second thing to figure out.",
  },
];

export default function StartPage() {
  return (
    <div className="home-page" style={{ maxWidth: 760, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* ── HERO ── one thesis, mirrors the homepage. */}
      <section className="field-glow" style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ START HERE</span>
        <h1 className="page-h1" style={{ margin: "10px 0 14px" }}>
          FREELON CITY in<br />
          <em>five steps.</em>
        </h1>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            maxWidth: 560,
          }}
        >
          Every face is a living AI citizen — an owned one remembers you. Meet one free, own
          it if you want it for keeps, then wake it up and put it to work. Here&apos;s the whole path.
        </p>
      </section>

      {/* ── THE FIVE STEPS ── reuses the .agent-howto sequence styling. */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <div className="agent-howto" style={{ padding: "18px 20px" }}>
          <ol className="agent-howto-steps">
            {STEPS.map((s) => (
              <li key={s.label}>
                <strong>{s.label}</strong> — {s.body}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTAs ── Meet Free primary, Own secondary — same order as the homepage. */}
      <section style={{ marginBottom: "var(--s-5)" }}>
        <div className="hero-cta-row">
          <TrackedLink
            className="btn btn-primary btn-lg"
            href="/demo"
            event="meet_citizen_click"
            from="start_page"
          >
            <span className="ttl">MEET A CITIZEN · FREE <span className="ar">→</span></span>
          </TrackedLink>
          <TrackedOpenSeaLink
            className="btn btn-secondary btn-lg"
            href={OPENSEA_BASE}
            from="start_page"
          >
            <span className="ttl">OWN A FREELON →</span>
          </TrackedOpenSeaLink>
        </div>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", marginTop: "var(--s-3)", lineHeight: 1.6 }}>
          Stuck on wallets or a term? The{" "}
          <Link href="/help" style={{ color: "var(--gold)" }}>2-minute help guide</Link>{" "}
          covers setup, routines, lingo and FAQ.
        </p>
      </section>
    </div>
  );
}
