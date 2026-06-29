import Link from "next/link";
import { TrackedExtLink } from "@/components/TrackedExtLink";
import { GODS } from "@/lib/gods";
import { CIVILIZATIONS } from "@/lib/constants";

/**
 * CRYPT LEGENDS TCG — homepage game-mode band (2026-06-29).
 *
 * The TCG was stripped from the homepage in the 2026-06-04 "agents only" pass,
 * leaving the live card game with no front-door entry — a stranger never learned
 * it existed. This band sells it as a real, clickable game mode: heading +
 * pitch + feature bullets + a fanned trio of REAL commander card art (the
 * on-chain 1/1 relics, lib/gods.ts) + a direct PLAY CTA into the deployed build.
 *
 * Server component. CTAs are the existing client TrackedExtLink / next Link.
 * Card art uses plain <img> off seadn.io (bypasses next/image domain config,
 * matching app/crypt-tcg/page.tsx).
 */

const GAME_URL = process.env.NEXT_PUBLIC_CRYPT_GAME_URL || "https://play.freeloncity.com";

const FEATURES = [
  "30-card decks",
  "OGs as Commanders",
  "GUARD · CRUSH · RUSH",
  "Archive battles",
  "Web playable",
];

// Three commanders fanned as the visual — picked for colour variety across
// civilizations so the fan reads as a real hand, not three of the same card.
const FAN_NAMES = ["Loki", "Odin", "Zeus"];
const FAN = FAN_NAMES.map((name) => GODS.find((g) => g.name === name)).filter(
  (g): g is (typeof GODS)[number] => Boolean(g),
);

export function CryptTcgBand() {
  return (
    <section
      className="reveal"
      aria-label="Crypt Legends TCG"
      style={{
        maxWidth: 1080,
        margin: "var(--s-6) auto",
        padding: "0 var(--s-4)",
      }}
    >
      <div
        className="crypt-band"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          gap: "var(--s-5)",
          alignItems: "center",
          padding: "var(--s-5)",
          borderRadius: 16,
          border: "1px solid var(--gold-dim, rgba(212,175,55,0.28))",
          background:
            "radial-gradient(120% 120% at 100% 0%, rgba(212,175,55,0.10), rgba(0,0,0,0.55) 60%), linear-gradient(135deg, rgba(0,0,0,0.6), rgba(8,8,10,0.85))",
          overflow: "hidden",
        }}
      >
        {/* COPY */}
        <div>
          <span className="kicker" style={{ color: "var(--gold)" }}>
            ⬡ CRYPT LEGENDS TCG · GAME MODE
          </span>
          <h2
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(30px, 4.4vw, 52px)",
              lineHeight: 0.96,
              letterSpacing: "-0.02em",
              margin: "10px 0 12px",
            }}
          >
            Command your OGs.{" "}
            <em style={{ color: "var(--gold)", fontStyle: "normal" }}>
              Build a deck.
            </em>{" "}
            Battle the archive.
          </h2>
          <p
            style={{
              fontFamily: "var(--mono2)",
              fontSize: 14,
              color: "var(--ink-2)",
              lineHeight: 1.7,
              maxWidth: 460,
              margin: 0,
            }}
          >
            The FREELON CITY card battler is live. Ten commanders — one per
            civilization — fight through The Crypt in a real solo-vs-AI duel you
            can play in your browser right now.
          </p>

          {/* FEATURE BULLETS */}
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "var(--s-4) 0 0",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {FEATURES.map((f) => (
              <li
                key={f}
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-2)",
                  padding: "5px 11px",
                  borderRadius: 999,
                  border: "1px solid rgba(212,175,55,0.28)",
                  background: "rgba(212,175,55,0.06)",
                  whiteSpace: "nowrap",
                }}
              >
                {f}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div
            style={{
              marginTop: "var(--s-4)",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <TrackedExtLink
              href={GAME_URL}
              event="crypt_play_click"
              from="home_tcg_band"
              className="btn btn-primary btn-lg"
            >
              <span className="ttl">PLAY TCG →</span>
            </TrackedExtLink>
            <Link className="btn btn-secondary" href="/crypt-tcg">
              <span className="ttl">ENTER THE ARCHIVE →</span>
            </Link>
          </div>

          {/* LIVE STATUS */}
          <div
            style={{
              marginTop: "var(--s-3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              fontFamily: "var(--mono2)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-dim)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--state-active)",
                boxShadow: "0 0 10px var(--state-active)",
              }}
            />
            Live · solo vs AI &nbsp;·&nbsp; ranked PvP coming
          </div>
        </div>

        {/* CARD FAN — real on-chain commander art */}
        <div
          aria-hidden
          className="crypt-band__fan"
          style={{
            position: "relative",
            height: 300,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {FAN.map((g, i) => {
            const civ = (
              CIVILIZATIONS as Record<string, { name: string; color: string }>
            )[g.civ];
            const color = civ?.color || "var(--gold)";
            const offset = i - (FAN.length - 1) / 2; // -1, 0, 1
            return (
              <div
                key={g.tokenId}
                style={{
                  position: "absolute",
                  width: 168,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${color}`,
                  boxShadow: `0 18px 40px rgba(0,0,0,0.6), 0 0 24px ${color}33`,
                  transform: `translateX(${offset * 86}px) rotate(${offset * 7}deg) translateY(${Math.abs(offset) * 16}px)`,
                  background: "#0a0a0c",
                  zIndex: 10 - Math.abs(offset),
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.image}
                  alt={g.name}
                  loading="lazy"
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 4",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.7) 100%)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 9,
                    bottom: 8,
                    fontFamily: "var(--display)",
                    fontSize: 15,
                    letterSpacing: "0.01em",
                    color,
                    textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                  }}
                >
                  {g.name.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
