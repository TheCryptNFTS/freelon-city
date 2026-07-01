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
    "Ways into the signal. Match the hex, restore the dark city, crack the daily frequency. Live browser games for FREELON CITY.",
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
// 2026-06-30 HIERARCHY PASS (acquisition teardown: "arcade mini-games sit
// co-equal with Mars; the flagships should dominate, the rest should be clearly
// lower-status"). The top grid is now the ONE flagship browser game (Mars); the
// card game (Crypt TCG) sits as the second flagship directly below it, and the
// arcade prototypes (Hex Match / Restore / Proof / Sweep / Reckoning / Cipher)
// all drop to the compact "MORE WAYS TO PLAY" row so they read as experiments,
// not as products competing with Mars + TCG. Genre lines also de-"Like X"-ed —
// naming a competitor's game made ours read derivative (copy pass, same date).
type GameCard = {
  href: string;
  kicker: string;
  title: string;
  genre: string;
  blurb: string;
  accent: string;
  img?: string;
};

const GAMES: GameCard[] = [
  {
    href: "/mars-command",
    kicker: "EXPLORE · REAL-TIME · NO WALLET",
    title: "Mars Command",
    genre: "Mars exploration + real-time combat",
    blurb:
      "Drive a rover across a living Mars, scan for buried sites, claim sectors for a sworn doctrine, and fight the Chorus in real time. A full game — free, no wallet, in the browser.",
    accent: "var(--gold-bright)",
    // 2026-07-01 flagship-art fix: the flagship cards were rendering a cheap
    // procedural SVG (GamePreview) while the real cinematic key art already
    // shipped on the homepage doors + route hero. Point /play at the same art so
    // Mars reads as a flagship here too, not a placeholder.
    img: "/og/art/mars-rover.webp",
  },
];

// GUARD THE POT — the marquee spectacle. Deliberately NOT a permanent 4th card:
// the hub was de-sprawled to three on 2026-06-07 ("too much stuff"). It only
// surfaces here when the round is actually LIVE (GUARD_POT_LIVE=true), so the
// default arcade stays the clean three-door layout and this appears as an event,
// not as more permanent clutter.
const GUARD_CARD: GameCard = {
  href: "/play/guard",
  kicker: "EVENT · LIVE NOW",
  title: "Guard the Pot",
  genre: "Talk past the AI · crack the vault",
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
    href: "/play/hex-match",
    kicker: "MATCH-THREE · NO WALLET",
    title: "Hex Match",
    blurb: "Swap glowing hex-eyes, line up three or more, chain combos to the target score. A 60-second skill hit.",
  },
  {
    href: "/play/proof",
    kicker: "DAILY DEDUCTION · NO WALLET",
    title: "Proof of Signal",
    blurb: "One hidden code a day. The dots tell you how close you are — pure deduction, same puzzle for everyone, shareable on X.",
  },
  {
    href: "/play/restore",
    kicker: "IDLE BUILDER · FREE",
    title: "Restore the Signal",
    blurb: "The city went dark at 404. Bring nodes online, generate signal, watch the ten civilizations light back up.",
  },
  {
    href: "/play/sweep",
    kicker: "REFLEX · NO WALLET",
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
          Two full games — explore Mars, command the Crypt deck — plus a rack of quick arcade experiments. Free, in the browser.
        </p>
        <p
          className="lead"
          style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}
        >
          Each one stands alone — none unlocks another, and nothing here hides
          clues for the others.
        </p>
      </section>

      {/* 2026-06-30 FLAGSHIP-FIRST: the two flagship games (Mars + Crypt TCG)
          now lead the hub. They previously sat BELOW the DailyTransmission +
          DailyHub reward ritual, so a first-time visitor met a "+10 ⬡ daily
          reward" block and a lore quote before they ever saw a game — burying
          the tentpoles the hero just promised. The daily ritual moved down,
          directly under the games. */}
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
            {/* Flagship cards show the real cinematic key art (with a warm-black
                scrim so the art fades into the card and the palette reads on-brand);
                event/prototype cards without art fall back to the mechanic poster. */}
            <div
              style={{
                position: "relative",
                margin: "-24px -22px 18px",
                borderBottom: `1px solid var(--line)`,
                overflow: "hidden",
                aspectRatio: g.img ? "16 / 9" : undefined,
              }}
            >
              {g.img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.img}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 42%", display: "block" }}
                  />
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(11,10,9,0) 30%, rgba(11,10,9,0.55) 78%, rgba(11,10,9,0.92) 100%)",
                    }}
                  />
                </>
              ) : (
                <GamePreview
                  kind={(g.href === "/mars-command" ? "mars" : g.href.replace("/play/", "")) as GameKind}
                  accent={g.accent}
                />
              )}
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
            padding: "0 0 26px",
            overflow: "hidden",
          }}
        >
          {/* Real Crypt key art — the card was text-only, reading unfinished next
              to a flagship. Same cinematic art as the /crypt-tcg hero + homepage
              door, with a warm-black scrim. 2026-07-01 flagship-art fix. */}
          <div style={{ position: "relative", borderBottom: "1px solid var(--line)", overflow: "hidden", aspectRatio: "16 / 9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/og/art/crypt-tcg.webp"
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%", display: "block" }}
            />
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(11,10,9,0) 30%, rgba(11,10,9,0.55) 78%, rgba(11,10,9,0.92) 100%)",
              }}
            />
          </div>
          <div style={{ padding: "22px 22px 0" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold-bright)", textTransform: "uppercase", marginBottom: 14 }}>
            CARD GAME · SOLO VS AI · DECK-BUILDER
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: 26, color: "var(--ink)", marginBottom: 4 }}>
            Crypt TCG
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--ink-2)", marginBottom: 12 }}>
            Solo deck-builder · battle the AI
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-dim)", margin: "0 0 18px", maxWidth: 720 }}>
            Ten commanders, one for each civilization. Build a deck and battle the AI now — and field your own Crypt cards if you hold them. Ranked play coming.
          </p>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-fade)", textTransform: "uppercase" }}>
            PLAY THE CARD GAME ↗
          </div>
          </div>
        </TrackedExtLink>
      </section>

      {/* ── DAILY RITUAL (former /daily) — demoted BELOW the flagship games
          (2026-06-30). The daily reward + transmission is a returning-holder
          loop, not the first thing a cold visitor should meet. */}
      <DailyTransmission />

      <DailyHub />

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
