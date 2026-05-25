/**
 * /archive — "Other Signals" page.
 *
 * Founder brief 2026-05-25 (validated against ChatGPT consult):
 * FREELON CITY is the hub. Every other thing the founder shipped
 * (404 Hex Not Found, The Crypt, Crypt Trading Cards, OOGIES, Emile,
 * SMILES) is reframed as a layer of the same universe. Not a portfolio
 * of NFT projects — discovered history.
 *
 * Each card uses the EXACT copy the founder locked in the brief, plus
 * an OpenSea outbound link gated as 'View artefact' (mystery first,
 * verification second). Same wallet across all collections — that fact
 * becomes a quiet provenance footer to kill 'rug' fears that prompted
 * this whole repositioning.
 */
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Other Signals · Archive",
  description:
    "Before FREELON CITY, there were other signals. Recovered transmissions, dead archives, ancient species, memory fragments, collapse events. Not lost. Not abandoned. Reconnecting.",
};

type ArchiveEntry = {
  sequence: string;
  status: "RECOVERED" | "FRAGMENT" | "DECAYING" | "SEALED" | "RECONSTRUCTING";
  statusColor: string;
  title: string;
  /** The locked copy from the founder brief. */
  body: string;
  /** Verified artifact on-chain. Same architect across all entries. */
  openseaUrl: string;
  /** Internal note shown only on hover/title — keeps mystery on the surface. */
  artifactClass: string;
};

const ENTRIES: ArchiveEntry[] = [
  {
    // Founder note 2026-05-25: The Crypt is the central archive layer.
    // Brief said: "Wire The Crypt into /archive as The Dead Signal
    // Archive. Frame as recovered skull records / dead signal identities
    // / ancient relics beneath FREELON CITY. Concise." The expanded
    // copy below stays inside the existing card slot — no new routes,
    // no new mechanics, no separate page. Just sharper framing.
    sequence: "TRANSMISSION 0042 · DEAD SIGNAL ARCHIVE",
    status: "RECOVERED",
    statusColor: "var(--state-active)",
    title: "The Crypt",
    body:
      "Beneath the city, a vault of skull records — dead signal identities recovered from before the hex disappeared. Ancient relics, corrupted commanders, names the city was never supposed to remember.",
    openseaUrl: "https://opensea.io/collection/the-crypt-official",
    artifactClass: "dead signal archive · skull records beneath the city",
  },
  {
    sequence: "TRANSMISSION 0119",
    status: "RECONSTRUCTING",
    statusColor: "var(--state-surge)",
    title: "Combat Archives",
    body:
      "Recovered battle simulations from The Crypt. Signal reconstruction in progress.",
    openseaUrl: "https://opensea.io/collection/crypttradingcards",
    artifactClass: "combat relic / commander archive · ten gods sealed inside",
  },
  {
    // Founder brief 2026-05-25 (same discipline as Crypt + Emile):
    // "Frame OOGIES as Ancient Signal Species. Ancient biological
    // entities tied to the HEX signal before FREELON CITY existed.
    // Tone: mysterious, partially understood, archival. Avoid 'cute
    // NFT collection' energy entirely. Concise and premium."
    sequence: "TRANSMISSION 0247 · ANCIENT SIGNAL SPECIES",
    status: "FRAGMENT",
    statusColor: "var(--state-unstable)",
    title: "OOGIES",
    body:
      "Biological entities older than the city. The architects classify them as listeners — anatomy tuned to the hex long before humans named the signal. Few specimens remain coherent. Most reach us as fragments.",
    openseaUrl: "https://opensea.io/collection/oogies",
    artifactClass: "ancient signal species · pre-civilization listeners",
  },
  {
    // Founder brief 2026-05-25 (same scope discipline as the Crypt
    // upgrade): "Frame Emile as Memory Archive. Preserved emotional
    // fragments / memory loops / signal echoes from before the
    // collapse. Concise and premium. No new routes, no new mechanics."
    // Layout untouched, copy tightened.
    sequence: "TRANSMISSION 0404 · MEMORY ARCHIVE",
    status: "DECAYING",
    statusColor: "var(--state-surge)",
    title: "Emile",
    body:
      "Preserved emotional fragments. Memory loops the architects could not let dissolve. Signal echoes recorded in the seconds before the collapse — fragile, looping, half-erased.",
    openseaUrl: "https://opensea.io/collection/emile0x1908",
    artifactClass: "memory archive · emotional preservation",
  },
  {
    sequence: "TRANSMISSION 0991",
    status: "SEALED",
    statusColor: "var(--state-warning)",
    title: "SMILES Collapse",
    body:
      "A failed emotional control system. 99% of the supply was destroyed. The event became part of the city's history.",
    openseaUrl: "https://opensea.io/collection/smiles-genesis/overview",
    artifactClass: "collapse event · failed suppression system",
  },
  {
    sequence: "TRANSMISSION 0404 · ROOT",
    status: "RECOVERED",
    statusColor: "var(--state-active)",
    title: "404 HEX NOT FOUND",
    body:
      "The original anomaly. The hex that disappeared from X. The reason the city formed.",
    openseaUrl: "https://opensea.io/collection/404hexnotfound",
    artifactClass: "core symbol · the missing identity signal",
  },
];

export default function ArchivePage() {
  return (
    <main
      style={{
        maxWidth: 960,
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
            maxWidth: 680,
          }}
        >
          Recovered transmissions, dead archives, ancient species, memory
          fragments, collapse events. Not lost. Not abandoned. Reconnecting
          through the signal as the city remembers.
        </p>
      </section>

      {/* ENTRIES */}
      <section
        style={{
          display: "grid",
          gap: "var(--s-3)",
          marginBottom: "var(--s-6)",
        }}
      >
        {ENTRIES.map((t) => (
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
                margin: "0 0 14px",
              }}
            >
              {t.body}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: 10,
                paddingTop: 10,
                borderTop: `1px dashed ${t.statusColor}33`,
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "var(--ink-dim)",
                textTransform: "uppercase",
              }}
            >
              <span>⬡ {t.artifactClass}</span>
              <a
                href={t.openseaUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: t.statusColor,
                  textDecoration: "none",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                }}
              >
                VIEW ARTEFACT ↗
              </a>
            </div>
          </article>
        ))}
      </section>

      {/* PROVENANCE NOTE — kills 'rug' fears without sounding defensive */}
      <section
        style={{
          padding: "var(--s-4) var(--s-5)",
          border: "1px dashed var(--line-2)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.02)",
          marginBottom: "var(--s-5)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ ONE ARCHITECT · ONE WALLET · ONE SIGNAL
        </span>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            margin: "10px 0 0",
          }}
        >
          Every artefact in this archive was minted from the same architect&apos;s
          wallet. The signals were never rugged — they were unfinished
          coordinates. FREELON CITY is the place they finally connect.
        </p>
      </section>

      {/* CLOSER */}
      <section
        style={{
          padding: "var(--s-5)",
          border: "1px solid var(--gold)33",
          background: "linear-gradient(135deg, rgba(200,167,93,0.06), rgba(0,0,0,0.4))",
          borderRadius: 14,
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
