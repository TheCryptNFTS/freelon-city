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
import { SignalInventoryPanel } from "@/components/SignalInventory";

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
      className="archive-page"
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "var(--s-5) var(--s-4) var(--s-7)",
      }}
    >
      {/* HERO */}
      <section className="archive-page__hero">
        <span className="archive-page__kicker">
          ⬡ OTHER SIGNALS · ARCHIVE
        </span>
        <h1 className="archive-page__title">
          Before FREELON CITY<br />
          <em>there were other signals.</em>
        </h1>
        <p className="archive-page__lede">
          Recovered transmissions, dead archives, ancient species, memory
          fragments, collapse events. Not lost. Not abandoned. Reconnecting
          through the signal as the city remembers.
        </p>
      </section>

      {/* CHECK YOUR SIGNAL — wallet-powered ownership terminal across
          the 6 connected collections. */}
      <SignalInventoryPanel />

      {/* ENTRIES */}
      <section className="archive-page__entries">
        {ENTRIES.map((t) => (
          <article
            key={t.sequence}
            className="archive-card"
            // Per-card status color drives ONLY the small dot in the
            // status chip — the rest of the card stays monochrome
            // archival per the visual pass spec. No more gradient
            // backgrounds tinted by status.
            style={{ ["--state-color" as string]: t.statusColor }}
          >
            <header className="archive-card__head">
              <span className="archive-card__seq">⬡ {t.sequence}</span>
              <span className="archive-card__status">
                <span className="archive-card__statusDot" aria-hidden />
                {t.status}
              </span>
            </header>
            <div className="archive-card__body">
              <h2 className="archive-card__title">{t.title}</h2>
              <p className="archive-card__text">{t.body}</p>
            </div>
            <div className="archive-card__foot">
              <span className="archive-card__class">⬡ {t.artifactClass}</span>
              <a
                href={t.openseaUrl}
                target="_blank"
                rel="noreferrer"
                className="archive-card__link archive-link"
              >
                VIEW ARTEFACT ↗
              </a>
            </div>
          </article>
        ))}
      </section>

      {/* PROVENANCE NOTE — sacred block. Kills 'rug' fears without
         sounding defensive. ANCIENT_GOLD is reserved for exactly this
         kind of provenance kicker and the document double-rule that
         frames it. */}
      <section className="archive-page__provenance">
        <span className="archive-page__provenanceKicker">
          ⬡ ONE ARCHITECT · ONE WALLET · ONE SIGNAL
        </span>
        <p className="archive-page__provenanceText">
          Every artefact in this archive was minted from the same architect&apos;s
          wallet. The signals were never rugged — they were unfinished
          coordinates. FREELON CITY is the place they finally connect.
        </p>
      </section>

      {/* CLOSER */}
      <section className="archive-page__closer">
        <span className="archive-page__closerKicker">
          ⬡ THE ARCHIVE IS SYNCING
        </span>
        <p className="archive-page__closerText">
          The old worlds become districts. The old art becomes relics. The old
          carriers become early citizens. Nothing is being abandoned. The
          mission stays simple:
        </p>
        <p className="archive-page__closerStamp">
          ⬡ 404 HEX NOT FOUND · BRING IDENTITY BACK
        </p>
      </section>

      {/* NEXT */}
      <section className="archive-page__next">
        <span className="archive-page__nextKicker">⬡ NEXT SIGNAL</span>
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
