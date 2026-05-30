import type { Metadata } from "next";
import Link from "next/link";
import { ArcadeProgress } from "@/components/ArcadeProgress";

export const metadata: Metadata = {
  title: "Play · FREELON CITY Arcade",
  description:
    "Six ways into the signal. Match the hex, sweep the corrupted floor, restore the dark city, crack the daily frequency, wage the weekly civ war, decode the transmission. Prototype arcade for FREELON CITY.",
  openGraph: {
    title: "FREELON CITY ARCADE",
    description:
      "Six ways into the signal. Match the hex, sweep the floor, restore the city, crack the frequency, wage the civ war, decode the transmission.",
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

const GAMES = [
  {
    href: "/play/hex-match",
    kicker: "ARCADE · NO WALLET",
    title: "Hex Match",
    blurb:
      "Swap glowing hex-eyes, line up three or more, chain combos. A 60-second skill hit. The free hook — anyone can play.",
    accent: "var(--neon-cyan)",
    tag: "ACQUISITION",
  },
  {
    href: "/play/restore",
    kicker: "IDLE · HOLDER-AWARE",
    title: "Restore the Signal",
    blurb:
      "The city went dark at 404. Bring nodes online, generate signal, watch the ten civilizations light back up. Holders compound.",
    accent: "var(--neon-magenta)",
    tag: "RETENTION",
  },
  {
    href: "/play/proof",
    kicker: "DAILY · NO WALLET",
    title: "Proof of Signal",
    blurb:
      "One hidden frequency a day — four signals from the ten doctrines. Tune to it in eight tries. Same puzzle for everyone, a shareable result for X.",
    accent: "var(--gold-bright)",
    tag: "ACQUISITION",
  },
  {
    href: "/play/sweep",
    kicker: "ARCADE · NO WALLET",
    title: "Sweep Run",
    blurb:
      "The floor is corrupting. Sweep the dead signals before they take the grid — but spare the living. A pure reflex hit. Beat your best, share the score.",
    accent: "var(--neon-cyan)",
    tag: "ACQUISITION",
  },
  {
    href: "/play/reckoning",
    kicker: "WEEKLY · HOLDER WAR",
    title: "The Reckoning",
    blurb:
      "Ten civilizations, one crown a week. Burn hex to muster for your side — your citizens amplify the signal. The leading civ when the week ends is crowned, and the city remembers.",
    accent: "var(--neon-magenta)",
    tag: "FURNACE",
  },
  {
    href: "/play/cipher",
    kicker: "ARG · LORE",
    title: "The Cipher",
    blurb:
      "Five fragments of a lost transmission, scattered across the lore. Decode each to reassemble what the city was trying to say.",
    accent: "var(--gold-bright)",
    tag: "COMMUNITY",
  },
];

export default function PlayHub() {
  return (
    <div className="manifesto">
      <section className="manifesto-hero">
        <span className="kicker">⬡ FREELON CITY · ARCADE · PROTOTYPE</span>
        <h1>
          Six ways into <em>the signal</em>.
        </h1>
        <p className="lead">
          The free hook. The reflex run. The holder loop. The daily ritual. The
          weekly war. The community hunt. Pick a door.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
              textDecoration: "none",
              border: "1px solid var(--line)",
              borderTop: `2px solid ${g.accent}`,
              background: "var(--bg-2)",
              padding: "24px 22px 26px",
              transition: "border-color .18s, transform .18s",
            }}
          >
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
                marginBottom: 10,
              }}
            >
              {g.title}
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
              {g.tag} · PLAY →
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
