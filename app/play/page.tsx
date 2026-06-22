import type { Metadata } from "next";
import Link from "next/link";
import { ArcadeProgress } from "@/components/ArcadeProgress";
import { PageBeacon } from "@/components/PageBeacon";
import { DailyHub } from "@/components/DailyHub";
import { DailyTransmission } from "@/components/play/DailyTransmission";
import { GamePreview, type GameKind } from "@/components/GamePreview";
import { TrackedExtLink } from "@/components/TrackedExtLink";
import { isGuardPotLive } from "@/lib/guard-pot";

// The compounding holder game lives on its own domain; the arcade routed its
// highest-intent play traffic straight past it (upgrade audit #17). Same env +
// branded fallback as /crypt-tcg.
const CRYPT_GAME_URL = process.env.NEXT_PUBLIC_CRYPT_GAME_URL || "https://play.freeloncity.com";

// Folded /daily transmission rolls per UTC day without redeploy
// (2026-05-31). Matches the former /daily page's force-dynamic.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arcade",
  description:
    "Ways into the signal. Match the hex, restore the dark city, crack the daily frequency. Prototype arcade for FREELON CITY.",
  openGraph: {
    title: "FREELON CITY ARCADE",
    description:
      "Ways into the signal. Match the hex, restore the city, crack the daily frequency.",
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
    href: "/mars-command",
    kicker: "EXPLORE · REAL-TIME · NO WALLET",
    title: "Mars Command",
    genre: "Mars exploration + real-time combat",
    blurb:
      "Drive a rover across a living Mars, scan for buried sites, claim sectors for a sworn doctrine, and fight the Chorus in real time. A full game — free, no wallet, in the browser.",
    accent: "var(--gold-bright)",  },
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
    kicker: "IDLE · FREE TO PLAY",
    title: "Restore the Signal",
    genre: "Like Cookie Clicker (idle game)",
    blurb:
      "The city went dark at 404. Bring nodes online, generate signal, watch the ten civilizations light back up. Holders build faster.",
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

// GUARD THE POT — the marquee spectacle. Deliberately NOT a permanent 4th card:
// the hub was de-sprawled to three on 2026-06-07 ("too much stuff"). It only
// surfaces here when the round is actually LIVE (GUARD_POT_LIVE=true), so the
// default arcade stays the clean three-door layout and this appears as an event,
// not as more permanent clutter.
const GUARD_CARD = {
  href: "/play/guard",
  kicker: "EVENT · LIVE NOW",
  title: "Guard the Pot",
  genre: "Like Freysa (beat the AI)",
  blurb:
    "One FREELON guards a sealed vault. Pay an escalating ⬡ fee to send it a message and try to convince it to release the prize. One winner cracks the vault.",
  accent: "var(--gold-bright)",
};

const VISIBLE_GAMES = isGuardPotLive() ? [GUARD_CARD, ...GAMES] : GAMES;

// MORE WAYS TO PLAY (2026-06-17, Algorithm review · Billy: "people like the mini
// games"). These prototypes were URL-only after the 06-07 de-sprawl so the main grid
// stayed clean — but players like them, so they get a COMPACT secondary row here
// (discoverable, not deletable) without rebuilding the "wall of six". Honest copy,
// incl. The Reckoning's real ⬡ burn so no holder spends by surprise.
const MORE_GAMES = [
  {
    href: "/play/sweep",
    kicker: "ARCADE · NO WALLET",
    title: "Sweep Run",
    blurb: "Sweep the dead signals before they take the grid — but spare the living. A 30-second reflex hit.",
  },
  {
    href: "/play/reckoning",
    kicker: "HOLDER · CIV WAR · BURNS ⬡",
    title: "The Reckoning",
    blurb: "The weekly civ-vs-civ war. Burn ⬡ to muster for your civilization; the side with the most signal is crowned.",
  },
  {
    href: "/play/cipher",
    kicker: "ARG · DECODE THE LORE",
    title: "The Cipher",
    blurb: "Five fragments of a lost transmission scattered across the lore. Decode each to reassemble what the city was trying to say.",
  },
];

export default function PlayHub() {
  return (
    <div className="manifesto">
      {/* T11 2026-06-11 — play_entered funnel event (fire-once client beacon). */}
      <PageBeacon name="play_entered" />
      <section className="manifesto-hero">
        <span className="kicker">⬡ FREELON CITY · ARCADE</span>
        <h1>
          Ways into <em>the signal</em>.
        </h1>
        <p className="lead">
          Free mini-games — the free hook, the holder loop, the daily ritual. Pick a door.
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
          maxWidth: 1120,
          margin: "32px auto 0",
        }}
      >
        {VISIBLE_GAMES.map((g) => (
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
                kind={(g.href === "/mars-command" ? "mars" : g.href.replace("/play/", "")) as GameKind}
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

      {/* THE CARD GAME — Crypt TCG (upgrade audit #17). The one compounding
          holder game was missing from both arcade grids, so the busiest play
          surface routed straight past it. External (play.freeloncity.com), so a
          tracked link rather than an internal grid card; crypt_play_click{from}
          lets us compare arcade vs direct landing as game entry points. */}
      <section style={{ maxWidth: 1120, margin: "16px auto 0" }}>
        <TrackedExtLink
          href={CRYPT_GAME_URL}
          event="crypt_play_click"
          from="arcade"
          style={{
            display: "block",
            textDecoration: "none",
            border: "1px solid var(--line)",
            borderTop: "2px solid var(--gold-bright)",
            background: "var(--bg-2)",
            padding: "24px 22px 26px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold-bright)", textTransform: "uppercase", marginBottom: 14 }}>
            CARD GAME · SOLO VS AI · DECK-BUILDER
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: 26, color: "var(--ink)", marginBottom: 4 }}>
            Crypt TCG
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--ink-2)", marginBottom: 12 }}>
            Like Hearthstone / Marvel Snap
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-dim)", margin: "0 0 18px", maxWidth: 720 }}>
            Ten commanders, one for each civilization. Build a deck and battle the AI now — and field your own Crypt cards if you hold them. Ranked play coming.
          </p>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-fade)", textTransform: "uppercase" }}>
            PLAY THE CARD GAME ↗
          </div>
        </TrackedExtLink>
      </section>

      {/* MORE WAYS TO PLAY — the loved prototypes, surfaced compactly (see MORE_GAMES). */}
      <section style={{ maxWidth: 1120, margin: "44px auto 0" }}>
        <span className="kicker" style={{ display: "block", marginBottom: 16 }}>⬡ MORE WAYS TO PLAY</span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {MORE_GAMES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              style={{
                display: "block",
                textDecoration: "none",
                border: "1px solid var(--line)",
                borderTop: "2px solid var(--gold)",
                borderRadius: 12,
                background: "var(--bg-2)",
                padding: "16px 18px 18px",
                transition: "border-color .18s, transform .18s",
              }}
            >
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.22em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 9 }}>
                {g.kicker}
              </div>
              <div style={{ fontFamily: "var(--display)", fontSize: 19, color: "var(--ink)", marginBottom: 6 }}>
                {g.title}
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-dim)", margin: "0 0 10px" }}>
                {g.blurb}
              </p>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.22em", color: "var(--ink-fade)", textTransform: "uppercase" }}>
                PLAY →
              </div>
            </Link>
          ))}
        </div>
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
        SCORES + PROGRESS SAVED LOCALLY · NOT ON-CHAIN
      </p>

      {/* 2026-06-07 funnel: the arcade has no own/unlock path — loop a visitor
          back to the real product so play isn't a dead-end door. */}
      <section style={{ marginTop: 40, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", marginBottom: 14 }}>
          Free to play. The deeper game is a FREELON you own and train.
        </p>
        <Link className="btn btn-primary" href="/demo">
          <span className="ttl">MEET A CITIZEN · FREE →</span>
        </Link>
      </section>
    </div>
  );
}
