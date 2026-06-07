import type { Metadata } from "next";
import Link from "next/link";
import { ArcadeProgress } from "@/components/ArcadeProgress";
import { DailyHub } from "@/components/DailyHub";
import { DailyTransmission } from "@/components/play/DailyTransmission";
import { GamePreview, type GameKind } from "@/components/GamePreview";

// Folded /daily transmission rolls per UTC day without redeploy
// (2026-05-31). Matches the former /daily page's force-dynamic.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play · FREELON CITY Arcade",
  description:
    "Three ways into the signal. Match the hex, restore the dark city, crack the daily frequency. Prototype arcade for FREELON CITY.",
  openGraph: {
    title: "FREELON CITY ARCADE",
    description:
      "Three ways into the signal. Match the hex, restore the city, crack the daily frequency.",
    images: [
      { url: "/api/og/play?t=THE%20ARCADE&k=PLAY%20THE%20SIGNAL", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FREELON CITY ARCADE",
    description: "Match the hex. Restore the city. Decode the transmission.",
    images: ["/api/og/play?t=THE%20ARCADE&k=PLAY%20THE%20SIGNAL"],
  },
};

// Each game carries a `genre` — a one-line "you already know this game"
// anchor (2026-05-31). Discord feedback: holders couldn't tell what the
// games were, so they played them wrong or bounced. Naming the familiar
// genre up front (Wordle / Bejeweled / idle clicker) lets people pattern-
// match in seconds instead of decoding the lore first.
// 2026-06-07 de-sprawl (founder: "too much stuff"): the hub now surfaces the
// THREE games with distinct, clear roles — the free hook, the holder loop, the
// daily ritual. The other prototypes (sweep / reckoning / cipher) still work by
// direct URL but are no longer listed here so the arcade reads as one clear
// door with a few games, not a wall of six near-identical prototypes.
const GAMES = [
  {
    href: "/play/hex-match",
    kicker: "ARCADE · NO WALLET",
    title: "Hex Match",
    genre: "Like Bejeweled / Candy Crush",
    blurb:
      "Swap glowing hex-eyes, line up three or more, chain combos. Hit the target score before your moves run out. A 60-second skill hit — anyone can play.",
    accent: "var(--neon-cyan)",  },
  {
    href: "/play/restore",
    kicker: "IDLE · HOLDER-AWARE",
    title: "Restore the Signal",
    genre: "Like Cookie Clicker (idle game)",
    blurb:
      "The city went dark at 404. Bring nodes online, generate signal, watch the ten civilizations light back up. Holders compound.",
    accent: "var(--neon-magenta)",  },
  {
    href: "/play/proof",
    kicker: "DAILY · NO WALLET",
    title: "Proof of Signal",
    genre: "Like Wordle (daily deduction)",
    blurb:
      "One hidden code a day. Guess it; the dots tell you how close you are. Crack it within your tries. No clues to unlock — pure deduction, same puzzle for everyone, shareable on X.",
    accent: "var(--gold-bright)",  },
];

export default function PlayHub() {
  return (
    <div className="manifesto">
      <section className="manifesto-hero">
        <span className="kicker">⬡ FREELON CITY · ARCADE · PROTOTYPE</span>
        <h1>
          Three ways into <em>the signal</em>.
        </h1>
        <p className="lead">
          The free hook. The holder loop. The daily ritual. Pick a door.
        </p>
        <p
          className="lead"
          style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}
        >
          Each one stands alone — none unlocks another, and nothing here hides
          clues for the others.
        </p>
      </section>

      {/* ── FOLDED: DAILY TRANSMISSION (former /daily) ── */}
      <DailyTransmission />

      <DailyHub />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gridAutoRows: "1fr",
          gap: 16,
          maxWidth: 1000,
          margin: "32px auto 0",
        }}
      >
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            style={{
              display: "block",
              height: "100%",
              textDecoration: "none",
              border: "1px solid var(--line)",
              borderTop: `2px solid ${g.accent}`,
              background: "var(--bg-2)",
              padding: "24px 22px 26px",
              transition: "border-color .18s, transform .18s",
            }}
          >
            {/* Game-specific SVG poster — mirrors the actual mechanic so
                each box SHOWS its game instead of being a plain panel. */}
            <div
              style={{
                margin: "-24px -22px 18px",
                borderBottom: `1px solid var(--line)`,
                overflow: "hidden",
              }}
            >
              <GamePreview
                kind={g.href.replace("/play/", "") as GameKind}
                accent={g.accent}
              />
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.28em",
                color: g.accent,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              {g.kicker}
            </div>
            <div
              style={{
                fontFamily: "var(--display)",
                fontSize: 26,
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {g.title}
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "var(--ink-2)",
                marginBottom: 12,
              }}
            >
              {g.genre}
            </div>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--ink-dim)",
                margin: "0 0 18px",
              }}
            >
              {g.blurb}
            </p>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "var(--ink-fade)",
                textTransform: "uppercase",
              }}
            >
              PLAY →
            </div>
          </Link>
        ))}
      </section>

      <ArcadeProgress />

      <p
        style={{
          textAlign: "center",
          marginTop: 40,
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "var(--ink-fade)",
        }}
      >
        PROTOTYPES · SCORES + PROGRESS SAVED LOCALLY · NOT YET ON-CHAIN
      </p>
    </div>
  );
}
