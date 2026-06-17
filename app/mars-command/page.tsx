/**
 * /mars-command — landing page for MARS COMMAND.
 *
 * A finished, free, no-wallet browser game that lives in the FREELON CITY
 * world. The game itself is a self-contained static build served at /mars
 * (public/mars/index.html); this page sells it and hands the player into it.
 *
 * Modeled on the Crypt TCG door: hero + what-it-is + a tracked PLAY button.
 * The in-game "OWN A FREELON" CTA + shareable seed links close the funnel
 * back to the city automatically once it's served same-origin.
 */
import Link from "next/link";
import type { Metadata } from "next";
import { TrackedExtLink } from "@/components/TrackedExtLink";
import { GamePreview } from "@/components/GamePreview";

const PAGE_DESC =
  "Mars Command — a free FREELON CITY game. Drive a rover across a living Mars, claim sectors for a sworn doctrine, fight the Chorus in real time, and silence the Void Scar. No wallet, no download — play in the browser.";

export const metadata: Metadata = {
  title: "Mars Command · Play Free",
  description: PAGE_DESC,
  openGraph: {
    title: "Mars Command · Play Free",
    description: PAGE_DESC,
    images: [
      { url: "/api/og/play?t=MARS%20COMMAND&k=DRIVE%20·%20CLAIM%20·%20FIGHT%20THE%20CHORUS", width: 1200, height: 630 },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mars Command · Play Free",
    description: "Drive a rover across a living Mars. Claim sectors. Fight the Chorus in real time. Free, no wallet.",
    images: ["/api/og/play?t=MARS%20COMMAND&k=DRIVE%20·%20CLAIM%20·%20FIGHT%20THE%20CHORUS"],
  },
};

const ACCENT = "var(--gold)";

type Beat = { glyph: string; label: string; copy: string };
const BEATS: Beat[] = [
  {
    glyph: "▸",
    label: "DRIVE & SCAN",
    copy: "A rover on a streaming, procedural Mars. Drive (or hold to steer), fire a signal scan to peel back the fog, and follow the echoes to buried sites.",
  },
  {
    glyph: "⬡",
    label: "CLAIM · SWEAR A DOCTRINE",
    copy: "Survey sites, then claim sectors for one of ten doctrines — each a real power that bends scan range, yield, speed, or the fight. Your banner shapes your run.",
  },
  {
    glyph: "✦",
    label: "THE CHORUS — REAL-TIME COMBAT",
    copy: "The corruption is a rival that marches on your holdings. Engagements drop you into a real-time 3D firefight: steer to aim, fire, dodge, hold your integrity.",
  },
  {
    glyph: "◇",
    label: "SILENCE THE VOID SCAR",
    copy: "Hold the planet, break the Chorus, and face the Void Heart — the boss at the wound where 404 touched the ground. Secure Mars and the run is yours.",
  },
];

export default function MarsCommandPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* HERO */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker" style={{ color: ACCENT }}>
          ⬡ MARS COMMAND · A FREELON CITY GAME
        </span>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(40px, 7vw, 80px)",
            lineHeight: 0.94,
            letterSpacing: "-0.02em",
            margin: "10px 0 14px",
          }}
        >
          Rebuild the signal<br />
          <em style={{ color: ACCENT, fontStyle: "normal" }}>on Mars.</em>
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 660 }}>
          Drive a rover across a living, procedural Mars. Scan for buried sites,
          claim sectors for a sworn doctrine, and fight the Chorus in real time.
          A full game in the browser — free, no wallet, no download.
        </p>

        {/* hero poster */}
        <div
          style={{
            margin: "var(--s-4) 0",
            border: "1px solid var(--line)",
            borderTop: `2px solid ${ACCENT}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <GamePreview kind="mars" accent={ACCENT} />
        </div>

        {/* PLAY CTA */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <TrackedExtLink href="/mars" event="mars_play_click" from="mars_landing_hero" className="btn btn-primary btn-lg">
            <span className="ttl">DEPLOY TO MARS · PLAY →</span>
          </TrackedExtLink>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--mono2)",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--state-active)", boxShadow: "0 0 10px var(--state-active)" }}
              aria-hidden
            />
            LIVE · FREE · NO WALLET
          </span>
        </div>
      </section>

      {/* WHAT IT IS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gridAutoRows: "1fr",
          gap: "var(--s-3)",
          marginBottom: "var(--s-6)",
        }}
      >
        {BEATS.map((b) => (
          <article
            key={b.label}
            style={{
              padding: "var(--s-4)",
              border: "1px solid var(--line)",
              background: "linear-gradient(135deg, rgba(216,178,92,0.06), rgba(0,0,0,0.4))",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              height: "100%",
              minHeight: 160,
            }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--mono2)",
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: ACCENT,
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 16 }}>{b.glyph}</span>
              {b.label}
            </header>
            <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>
              {b.copy}
            </p>
          </article>
        ))}
      </section>

      {/* CLOSER */}
      <section
        style={{
          padding: "var(--s-5)",
          border: "1px dashed var(--line-2)",
          borderRadius: 12,
          background: "rgba(0,0,0,0.3)",
          marginBottom: "var(--s-5)",
        }}
      >
        <span className="kicker" style={{ color: ACCENT }}>⬡ ON THE GROUND</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginTop: 12 }}>
          Every planet is seeded — share your link and a friend lands on the same
          Mars to beat your sectors held. Progress saves in your browser; there&apos;s
          nothing to buy to play. When you&apos;re ready to own a piece of the city,
          the door is one tap away inside the game.
        </p>
      </section>

      {/* NEXT */}
      <section style={{ textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
          <TrackedExtLink className="btn btn-primary" href="/mars" event="mars_play_click" from="mars_landing_close">
            <span className="ttl">PLAY MARS COMMAND →</span>
          </TrackedExtLink>
          <Link className="btn btn-secondary" href="/play">
            <span className="ttl">ALL GAMES →</span>
          </Link>
          <Link className="btn btn-secondary" href="/">
            <span className="ttl">RETURN TO THE CITY →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
