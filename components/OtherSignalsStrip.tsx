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

type Card = {
  title: string;
  body: string;
  status: string;
  statusColor: string;
};

const CARDS: Card[] = [
  {
    title: "The Crypt",
    status: "RECOVERED",
    statusColor: "var(--state-active)",
    body: "Dead signals. Forgotten identities. Ancient records recovered beneath the city.",
  },
  {
    title: "Combat Archives",
    status: "RECONSTRUCTING",
    statusColor: "var(--state-surge)",
    body: "Recovered battle simulations from The Crypt. Signal reconstruction in progress.",
  },
  {
    title: "OOGIES",
    status: "FRAGMENT",
    statusColor: "var(--state-unstable)",
    body: "Ancient signal species. They heard the HEX before the city existed.",
  },
  {
    title: "Emile",
    status: "DECAYING",
    statusColor: "var(--state-surge)",
    body: "Memory fragments preserved before the signal collapse.",
  },
  {
    title: "SMILES Collapse",
    status: "SEALED",
    statusColor: "var(--state-warning)",
    body: "A failed emotional control system. 99% of the supply was destroyed. The event became part of the city's history.",
  },
];

export function OtherSignalsStrip() {
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

      <Link
        href="/archive"
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "var(--s-3)",
          }}
        >
          {CARDS.map((c) => (
            <article
              key={c.title}
              style={{
                padding: "var(--s-4)",
                border: `1px solid ${c.statusColor}33`,
                background: `linear-gradient(135deg, ${c.statusColor}08, rgba(0,0,0,0.4))`,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: 160,
                transition: "border-color 120ms ease, transform 120ms ease",
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
                  color: c.statusColor,
                  fontWeight: 700,
                }}
              >
                <span>● {c.status}</span>
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
          ))}
        </div>
      </Link>
    </section>
  );
}
