/**
 * <OtherSignalsStrip /> — homepage section: 5 archive cards.
 *
 * Founder brief 2026-05-25 spec'd an Archives section visible on the
 * homepage itself. This is the compact version: 5 cards, locked copy
 * from the brief, each linking to /archive (deep page handles the
 * outbound OpenSea links + provenance footer).
 *
 * Goal per brief: "make old projects feel discovered, not listed."
 * So each card reads as a transmission, not a project.
 */
import Link from "next/link";
import { getFloors, formatFloor } from "@/lib/floor-prices";

type Card = {
  title: string;
  body: string;
  status: string;
  statusColor: string;
  /** OpenSea slug — used to look up the live floor price. */
  slug: string;
  /**
   * Where this card links. Each collection points to a DISTINCT destination
   * (its own OpenSea collection, or its on-site page) — previously the whole
   * grid was wrapped in one /archive link, so every card landed on the same
   * page showing the same info (founder: "same information on EVERY page").
   */
  href: string;
  /**
   * Real on-chain art (one representative token / cover) per collection,
   * off OpenSea's seadn.io CDN. Resolved once via the OpenSea API and
   * hardcoded so the homepage stays static (no runtime fetch). Lets the
   * archive strip SHOW each collection instead of describing it. CSP
   * img-src allows *.seadn.io (next.config.ts).
   */
  image: string;
};

const CARDS: Card[] = [
  {
    title: "The Crypt",
    status: "RECOVERED",
    statusColor: "var(--gold-bright)",
    slug: "the-crypt-official",
    href: "/collections/the-crypt-official",
    body: "Dead signals. Forgotten identities. Ancient records recovered beneath the city.",
    // "Walter" (#1907) — a One of One skull record.
    image:
      "https://i2c.seadn.io/ethereum/0x06827dea49f5ff963bf15beb7cfc3b211c50b41c/62731ec9b5f6ba2d2476c16b566881/a362731ec9b5f6ba2d2476c16b566881.png",
  },
  {
    title: "Crypt TCG",
    status: "RECONSTRUCTING",
    statusColor: "var(--void-purple)",
    slug: "crypttradingcards",
    href: "/crypt-tcg",
    body: "Recovered battle simulations from The Crypt. Signal reconstruction in progress.",
    // Anubis (#1519) — the recovered god relic; same art shown on /combat-archives.
    image:
      "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/7b5c6c2b8cdeda3ae4238574005ea0/867b5c6c2b8cdeda3ae4238574005ea0.jpeg",
  },
  {
    title: "OOGIES",
    status: "FRAGMENT",
    statusColor: "var(--ink)",
    slug: "oogies",
    href: "/collections/oogies",
    body: "Ancient signal species. They heard the HEX before the city existed.",
    // "Horse Relic" (#2575) — the rarest OOGIES tier ("Relics"); on-theme
    // as a recovered relic. OOGIES has no designated 1/1.
    image:
      "https://i2c.seadn.io/ape_chain/0x214cae51c3bae88515aaefd8e1867e64502b0342/2c469337fc98d8e6fc65ddaf2d9493/4f2c469337fc98d8e6fc65ddaf2d9493.png",
  },
  {
    title: "Emile",
    status: "DECAYING",
    statusColor: "var(--gold-deep)",
    slug: "emile0x1908",
    href: "/collections/emile0x1908",
    body: "Memory fragments preserved before the signal collapse.",
    // Emile's signature gilded glass figure (local mirror) — the OpenSea
    // collection cover read as a near-duplicate of the SMILES gold art, so
    // we serve the distinct hero still instead.
    image: "/heroes/emile.jpg",
  },
  {
    title: "SMILES Collapse",
    status: "SEALED",
    statusColor: "var(--signal-red)",
    slug: "smiles-genesis",
    href: "/collections/smiles-genesis",
    body: "A failed emotional control system. 99% of the supply was destroyed. The event became part of the city's history.",
    // "Gilded Emissary" (#74) — a One of One (Series: One of One).
    image:
      "https://i2c.seadn.io/ethereum/0x30ac46575d2f3474edc79b084088819805e1ef42/93f22023c68dad315e737fddb3d4b7/7693f22023c68dad315e737fddb3d4b7.png",
  },
];

export async function OtherSignalsStrip() {
  // Live floor prices (cached 1h server-side). Defensive: if OpenSea is
  // unreachable each entry is null and the badge simply doesn't render.
  const floors = await getFloors(CARDS.map((c) => c.slug));

  return (
    <section
      aria-label="Other signals · archives"
      style={{
        maxWidth: "var(--maxw)",
        margin: "var(--s-6) auto",
        padding: "0 var(--pad)",
      }}
    >
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
        <div>
          <span className="kicker" style={{ color: "var(--gold)" }}>
            ⬡ OTHER SIGNALS · ARCHIVE
          </span>
          <h2
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(28px, 4vw, 44px)",
              lineHeight: 1,
              letterSpacing: "-0.015em",
              margin: "10px 0 4px",
            }}
          >
            Before FREELON CITY <em style={{ color: "var(--gold)", fontStyle: "normal" }}>there were other signals.</em>
          </h2>
        </div>
        <Link
          href="/archive"
          className="kicker"
          style={{
            color: "var(--gold)",
            letterSpacing: "0.22em",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ENTER THE ARCHIVE →
        </Link>
      </header>

      <p
        style={{
          fontFamily: "var(--mono2)",
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.7,
          maxWidth: 680,
          marginBottom: "var(--s-4)",
        }}
      >
        Old districts, ancient species, memory fragments, collapse events.
        Recovered through the signal as the city remembers.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          // Equal-height rows: every card stretches to the tallest in its
          // row regardless of body-copy length, so the strip reads as a
          // uniform set instead of ragged boxes (founder: "the 5 boxes are
          // different sizes").
          gridAutoRows: "1fr",
          gap: "var(--s-3)",
        }}
      >
        {CARDS.map((c) => {
          const external = c.href.startsWith("http");
          return (
            <Link
              key={c.title}
              href={c.href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              style={{ display: "block", height: "100%", textDecoration: "none", color: "inherit" }}
            >
            <article
              style={{
                padding: "var(--s-4)",
                border: `1px solid ${c.statusColor}33`,
                background: `linear-gradient(135deg, ${c.statusColor}08, rgba(0,0,0,0.4))`,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                height: "100%",
                transition: "border-color 120ms ease, transform 120ms ease",
              }}
            >
              {/* Real on-chain art (seadn.io CDN). Dark gradient + slight
                  desaturation so it reads as a recovered archive record,
                  consistent with the god cards on /combat-archives. */}
              <div
                style={{
                  position: "relative",
                  aspectRatio: "16 / 10",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: `1px solid ${c.statusColor}33`,
                  background: "rgba(0,0,0,0.5)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={`${c.title} — recovered archive record`}
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
                    background: `linear-gradient(180deg, transparent 50%, ${c.statusColor}14 82%, rgba(0,0,0,0.55) 100%)`,
                  }}
                />
              </div>
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontFamily: "var(--mono2)",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: c.statusColor,
                  fontWeight: 700,
                }}
              >
                <span>● {c.status}</span>
                {formatFloor(floors[c.slug]) && (
                  <span style={{ color: "var(--gold)" }}>
                    FLOOR {formatFloor(floors[c.slug])}
                  </span>
                )}
              </header>
              <h3
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 22,
                  lineHeight: 1.1,
                  letterSpacing: "-0.005em",
                  margin: 0,
                  color: "var(--ink)",
                }}
              >
                {c.title}
              </h3>
              <p
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 12,
                  color: "var(--ink-2)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {c.body}
              </p>
            </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
