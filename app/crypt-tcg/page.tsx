/**
 * /combat-archives — placeholder lore page.
 *
 * Founder brief 2026-05-25:
 *   "The TCG is almost built but currently indie/template-looking, so
 *    mark it as coming soon / reconstruction unstable rather than
 *    overpromising."
 *
 * Frame it as a recovered system that's still being reconstructed.
 * Lore-consistent waiting state instead of a generic "coming soon."
 * When the real game ships, swap this page out for the interface.
 *
 * Critical brief rule: do NOT use "blockchain card game" language.
 * Cards are "relics" / "commanders" / "combat records" — NOT
 * "trading cards" / "deck mechanics" / "play-to-earn."
 */
import Link from "next/link";
import type { Metadata } from "next";
import { GODS, godOpenSeaUrl } from "@/lib/gods";
import { CIVILIZATIONS } from "@/lib/constants";
import { getFloors, formatFloor } from "@/lib/floor-prices";

// Phase 2 metadata 2026-05-27 — route-specific OG card (combat-archives.jpg).
// 2026-06-10: the game shipped — the door is live. OG promises play because
// the page delivers a real solo-vs-AI match.
const PAGE_DESC =
  "Crypt TCG — the FREELON CITY card game. Ten commanders, one for each civilization. Build a deck and battle the AI now — ranked play coming.";
export const metadata: Metadata = {
  title: "Crypt TCG · The Card Game",
  description: PAGE_DESC,
  openGraph: {
    title: "Crypt TCG · The Card Game",
    description: PAGE_DESC,
    images: [{ url: "/og/combat-archives.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypt TCG · The Card Game",
    description: PAGE_DESC,
    images: ["/og/combat-archives.jpg"],
  },
};

// 2026-06-10: the game shipped. Door points at the deployed build; env var
// lets it flip to play.freeloncity.com later with no code change.
const GAME_URL = process.env.NEXT_PUBLIC_CRYPT_GAME_URL || "https://crypt-game.vercel.app";

type Fragment = {
  glyph: string;
  label: string;
  copy: string;
  status: "RECOVERED" | "CORRUPTED" | "SEALED" | "DECAYING";
  color: string;
};

const FRAGMENTS: Fragment[] = [
  {
    glyph: "⬡",
    label: "RELIC RECORDS",
    copy: "Ancient combat artefacts recovered from The Crypt. Each carries a fragment of a commander the city forgot.",
    status: "RECOVERED",
    color: "var(--state-active)",
  },
  {
    glyph: "⬢",
    label: "TEN GODS",
    copy: "Sealed inside the relic record. Each tied to one of the ten civilizations. Their names surface as the signal stabilises.",
    status: "SEALED",
    color: "var(--state-warning)",
  },
  {
    glyph: "◇",
    label: "BATTLE SIMULATIONS",
    copy: "Reconstructed engagements between civilizations. The earliest recordings are still corrupted past use.",
    status: "CORRUPTED",
    color: "var(--state-surge)",
  },
  {
    glyph: "◈",
    label: "ARCHIVE INTERFACE",
    copy: "The terminal is open. Carriers can enter the relic record now — solo runs against the AI, with ranked play surfacing next.",
    status: "RECOVERED",
    color: "var(--state-active)",
  },
];

export default async function CombatArchivesPage() {
  const floors = await getFloors(["crypttradingcards"]);
  const floor = formatFloor(floors["crypttradingcards"]);

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "var(--s-5) var(--s-4) var(--s-7)",
      }}
    >
      {/* HERO */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ CRYPT TCG · THE CARD GAME
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
          The Crypt<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>
            card game.
          </em>
        </h1>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            maxWidth: 660,
          }}
        >
          Ten commanders, one for each civilization. Collect cards, build a
          deck, and battle. The first playable build is live — jump into a
          solo match against the AI right now.
        </p>

        {/* PLAY CTA — the game is live (solo vs AI). Ranked PvP is the next
            beat; the door is honest about both. GAME_URL is env-overridable. */}
        <div style={{ marginTop: "var(--s-4)", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <a href={GAME_URL} target="_blank" rel="noreferrer" className="btn btn-primary btn-lg">
            <span className="ttl">ENTER THE TERMINAL · PLAY →</span>
          </a>
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
            LIVE · solo vs AI &nbsp;·&nbsp; ranked PvP coming
          </span>
        </div>

        {floor && (
          <div
            style={{
              marginTop: "var(--s-3)",
              fontFamily: "var(--mono2)",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink-dim)",
            }}
          >
            ⬡ RELIC FLOOR ·{" "}
            <a
              href="https://opensea.io/collection/crypttradingcards"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--gold)", textDecoration: "none" }}
            >
              {floor} ↗
            </a>
          </div>
        )}
      </section>

      {/* FRAGMENTS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gridAutoRows: "1fr",
          gap: "var(--s-3)",
          marginBottom: "var(--s-6)",
        }}
      >
        {FRAGMENTS.map((f) => (
          <article
            key={f.label}
            style={{
              padding: "var(--s-4)",
              border: `1px solid ${f.color}33`,
              background: `linear-gradient(135deg, ${f.color}08, rgba(0,0,0,0.4))`,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              height: "100%",
              minHeight: 180,
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontFamily: "var(--mono2)",
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: f.color,
                fontWeight: 700,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{f.glyph}</span>
                {f.label}
              </span>
              <span
                style={{
                  padding: "2px 8px",
                  border: `1px solid ${f.color}55`,
                  borderRadius: 999,
                  fontSize: 9,
                }}
              >
                ● {f.status}
              </span>
            </header>
            <p
              style={{
                fontFamily: "var(--mono2)",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {f.copy}
            </p>
          </article>
        ))}
      </section>

      {/* TEN GODS REVEAL — the structural connection from the founder
          brief: 10 civilizations × 10 gods, each tied. Sourced from
          lib/gods.ts (on-chain confirmed 1/1s in Crypt Trading Cards
          0x48fd...7394). */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: "var(--s-3)",
          }}
        >
          <span className="kicker" style={{ color: "var(--gold)" }}>
            ⬡ THE TEN GODS · SEALED IN THE RELIC RECORD
          </span>
          <span
            style={{
              fontFamily: "var(--mono2)",
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
            }}
          >
            ONE GOD · ONE CIVILIZATION
          </span>
        </header>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            margin: "0 0 var(--s-3)",
            maxWidth: 680,
          }}
        >
          Ten ancient entities recovered through the relic record. Each
          is bound — by symbol, doctrine, or domain — to one of the city&apos;s
          ten civilizations. The connection was never declared. It was
          discovered.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gridAutoRows: "1fr",
            gap: "var(--s-3)",
          }}
        >
          {GODS.map((g) => {
            const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[g.civ];
            const color = civ?.color || "var(--gold)";
            return (
              <a
                key={g.tokenId}
                href={godOpenSeaUrl(g)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  height: "100%",
                  padding: "var(--s-4)",
                  border: `1px solid ${color}55`,
                  background: `linear-gradient(135deg, ${color}10, rgba(0,0,0,0.4))`,
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 120ms ease, transform 120ms ease",
                }}
              >
                {/* Real on-chain relic art (the 1/1 commander card). seadn.io
                    CDN, plain <img> so it bypasses next/image domain config.
                    The relic is "recovered through the signal" — slightly
                    desaturated + dark gradient overlay so it reads as an
                    archived record, not a finished playable card. */}
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: `1px solid ${color}33`,
                    marginBottom: 12,
                    background: "rgba(0,0,0,0.5)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.image}
                    alt={`${g.name} — recovered relic record #${g.tokenId}`}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: "saturate(0.85) contrast(1.02)",
                    }}
                  />
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(180deg, transparent 45%, ${color}14 80%, rgba(0,0,0,0.55) 100%)`,
                    }}
                  />
                </div>
                <header
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 8,
                    fontFamily: "var(--mono2)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    color: color,
                    fontWeight: 700,
                  }}
                >
                  <span>● {g.status}</span>
                  <span style={{ color: "var(--ink-dim)" }}>#{g.tokenId}</span>
                </header>
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 26,
                    lineHeight: 1,
                    color,
                    letterSpacing: "-0.005em",
                    margin: "4px 0 10px",
                  }}
                >
                  {g.name.toUpperCase()}
                </div>
                <p
                  style={{
                    fontFamily: "var(--mono2)",
                    fontSize: 11,
                    color: "var(--ink-2)",
                    lineHeight: 1.5,
                    margin: "0 0 6px",
                  }}
                >
                  {g.line}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    paddingTop: 8,
                    marginTop: 8,
                    borderTop: `1px dashed ${color}33`,
                    fontFamily: "var(--mono2)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--ink-dim)",
                  }}
                >
                  <span style={{ color }}>{civ?.name?.toUpperCase()}</span>
                  <span>VIEW RELIC ↗</span>
                </div>
              </a>
            );
          })}
        </div>
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
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ INSIDE THE TERMINAL
        </span>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            marginTop: 12,
          }}
        >
          The first archive entries surface through your wallet. Civ
          alignment dictates which commanders answer. The ten Gods are
          revealed as their relics come online — not before.
        </p>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 11,
            color: "var(--ink-dim)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 12,
          }}
        >
          ⬡ THE COMMANDERS ARE WAITING
        </p>
      </section>

      {/* NEXT */}
      <section style={{ textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
          <a className="btn btn-primary" href={GAME_URL} target="_blank" rel="noreferrer">
            <span className="ttl">PLAY THE GAME →</span>
          </a>
          <Link className="btn btn-secondary" href="/civilizations">
            <span className="ttl">10 CIVILIZATIONS →</span>
          </Link>
          <Link className="btn btn-secondary" href="/">
            <span className="ttl">RETURN TO THE CITY →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
