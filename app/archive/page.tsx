/**
 * /archive — "Other Signals" page.
 *
 * The frame the founder asked for (2026-05-25): every other thing
 * Billy ever shipped (Crypt, Oogies, Emile, Smiles, etc.) reframed
 * as "recovered transmissions" from BEFORE the city formed around
 * the HEX. Mysterious by design — ChatGPT advice was: leave gaps,
 * let viewers connect the dots, do not over-explain.
 *
 * Each card reads as an ARG-style entry:
 *   - sequence number (cryptic)
 *   - corruption / status badge
 *   - one-line transmission
 *   - no outbound links (mystery first)
 *
 * Phase 1: stubs only. When a frame becomes a real expansion (e.g.
 * Crypt TCG actually plays), the card gets a "deeper" link.
 */
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Other Signals · Archive",
  description:
    "Before FREELON CITY, there were other signals. Recovered transmissions, dead archives, ancient species, memory fragments. Not lost. Not abandoned. Reconnecting.",
};

type Transmission = {
  sequence: string;
  status: "RECOVERED" | "CORRUPTED" | "DECAYING" | "FRAGMENT" | "SEALED";
  statusColor: string;
  title: string;
  body: string;
  // No href on purpose. ARG vibe — visitors who know, know.
};

const TRANSMISSIONS: Transmission[] = [
  {
    sequence: "TRANSMISSION 0042",
    status: "RECOVERED",
    statusColor: "var(--state-active)",
    title: "The dead district",
    body:
      "Ancient skull-citizens. Corrupted relics. Combat records from before the signal was named. The city archives mark this layer as the first thing that remembered.",
  },
  {
    sequence: "TRANSMISSION 0119",
    status: "FRAGMENT",
    statusColor: "var(--state-surge)",
    title: "Non-human entities",
    body:
      "Witnesses heard the signal first. Not citizens. Not architects. Something else — already listening when the hex disappeared. Their classification is still pending.",
  },
  {
    sequence: "TRANSMISSION 0404",
    status: "DECAYING",
    statusColor: "var(--state-unstable)",
    title: "Memory artefacts",
    body:
      "Emotional records, preserved in glass. The city architects believe these are echoes of citizens who carried the signal before identity was reissued. Most are incomplete.",
  },
  {
    sequence: "TRANSMISSION 0991",
    status: "SEALED",
    statusColor: "var(--state-warning)",
    title: "Collapse event",
    body:
      "Ninety-nine percent of the supply burned. The remaining records describe a propaganda system deployed to suppress signal anxiety. It did not hold. The collapse is on the wall.",
  },
];

export default function ArchivePage() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "var(--s-5) var(--s-4) var(--s-7)",
      }}
    >
      {/* HERO */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ OTHER SIGNALS · ARCHIVE
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
          Before FREELON CITY<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>
            there were other signals.
          </em>
        </h1>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          Recovered transmissions, dead archives, ancient species, memory
          fragments. Not lost. Not abandoned. Reconnecting through the
          signal as the city remembers.
        </p>
      </section>

      {/* TRANSMISSIONS */}
      <section
        style={{
          display: "grid",
          gap: "var(--s-3)",
          marginBottom: "var(--s-6)",
        }}
      >
        {TRANSMISSIONS.map((t) => (
          <article
            key={t.sequence}
            style={{
              padding: "var(--s-4) var(--s-5)",
              border: `1px solid ${t.statusColor}33`,
              background: `linear-gradient(135deg, ${t.statusColor}08, rgba(0,0,0,0.4))`,
              borderRadius: 12,
              position: "relative",
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 12,
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ink-dim)",
              }}
            >
              <span>⬡ {t.sequence}</span>
              <span
                style={{
                  color: t.statusColor,
                  fontWeight: 700,
                  padding: "3px 10px",
                  border: `1px solid ${t.statusColor}55`,
                  borderRadius: 999,
                }}
              >
                ● {t.status}
              </span>
            </header>
            <h2
              style={{
                fontFamily: "var(--display)",
                fontSize: "clamp(22px, 3vw, 32px)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                margin: "0 0 10px",
                color: "var(--ink)",
              }}
            >
              {t.title}
            </h2>
            <p
              style={{
                fontFamily: "var(--mono2)",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {t.body}
            </p>
          </article>
        ))}
      </section>

      {/* CLOSER */}
      <section
        style={{
          padding: "var(--s-5)",
          border: "1px dashed var(--line-2)",
          borderRadius: 14,
          background: "rgba(0,0,0,0.3)",
          marginBottom: "var(--s-5)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ THE ARCHIVE IS SYNCING
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
          The old worlds become districts. The old art becomes relics. The old
          carriers become early citizens. Nothing is being abandoned. The
          mission stays simple:
        </p>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: "var(--gold)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginTop: 12,
          }}
        >
          ⬡ 404 HEX NOT FOUND · BRING IDENTITY BACK
        </p>
      </section>

      {/* NEXT */}
      <section style={{ textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div
          className="ui-cta-row"
          style={{ marginTop: "var(--s-2)", justifyContent: "center" }}
        >
          <Link className="btn btn-primary" href="/">
            <span className="ttl">ENTER THE CITY →</span>
          </Link>
          <Link className="btn btn-secondary" href="/civilizations">
            <span className="ttl">10 CIVILIZATIONS →</span>
          </Link>
          <Link className="btn btn-secondary" href="/canon">
            <span className="ttl">THE CANON →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
