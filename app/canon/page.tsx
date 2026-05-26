/**
 * /canon — unified reference library.
 *
 * Consolidates the city's six lore pages (Origin, Civilizations, Castes,
 * Shapes, Lexicon, Manifesto, The Art System) into a single browsable
 * index. Each section is a short summary + pull-quote + deep-link to
 * the full original page. The originals stay live for SEO + share links.
 *
 * Uses <details>/<summary> with id anchors so /canon#origin works
 * without client JS. Server component, prerenders cleanly.
 */
import type { Metadata } from "next";
import Link from "next/link";

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "The locked rules, sacred numbers, archive layers, and named entities of FREELON CITY.";
export const metadata: Metadata = {
  title: "Canon · Reference Library",
  description: PAGE_DESC,
  openGraph: {
    title: "Canon · Reference Library",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Canon · Reference Library",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

// The Next 15 build pipeline hits a webpack chunking failure
// ("Cannot find module './NNNN.js'") when prerendering some pages
// in this project; force-dynamic sidesteps the broken collection step
// without losing functionality (the page is pure server-rendered HTML).
export const dynamic = "force-dynamic";

type Tab = {
  id: string;
  kicker: string;
  title: string;
  href: string;
  hrefLabel: string;
  summary: string[];
  quote?: string;
};

const TABS: Tab[] = [
  {
    id: "origin",
    kicker: "I · ORIGIN",
    title: "The hex didn't disappear. It changed location.",
    href: "/origin",
    hrefLabel: "READ THE ORIGIN →",
    summary: [
      "X once made digital ownership visible — a small hexagonal mark next to verified NFT profile pictures, woven into identity, present in every feed. Then it was quietly removed. No replacement. No handoff. Just absence.",
      "FREELON CITY is the answer to that absence. Humanity colonised Mars, then began detecting a signal. A city formed around it. The signal reshaped its citizens biologically, spiritually, technologically. The hexagon — present in the signal's mathematics — became sacred. 4040 citizens. 10 civilizations. 7 castes. 16 shapes.",
    ],
    quote: "The platform removed the frame. The people became the frame.",
  },
  {
    id: "civilizations",
    kicker: "II · CIVILIZATIONS",
    title: "Ten signal doctrines. One contract.",
    href: "/civilizations",
    hrefLabel: "EXPLORE CIVILIZATIONS →",
    summary: [
      "Every citizen belongs to exactly one of ten civilizations — Synthesis, Corruption, Growth, Oracle, Transmission, Luxury, Fracture, Sovereignty, Void, Machine. Civilization is set on-chain at mint and determines color, caste eligibility, and in-city earning bonuses.",
      "The civilizations page is the city's only interactive map: explore each doctrine's district, population, holders, and signal score. Silver Machine's 80 is the rarest — they were here before the colonists.",
    ],
    quote: "We did not split. We refracted.",
  },
  {
    id: "castes",
    kicker: "III · CASTES",
    title: "Every city has a structure. Every citizen has a place.",
    href: "/castes",
    hrefLabel: "SEE THE 7 CASTES →",
    summary: [
      "Seven castes derive deterministically from on-chain traits. Hex State combined with Tier determines where a citizen stands in the social hierarchy — Carrier, Architect, Choir, Witness, Throne, Vector, Voice.",
      "Population is fixed by the contract. Signal Born is the most numerous. The Throne is the rarest. Caste is not assigned — it is read from what is already locked.",
    ],
  },
  {
    id: "shapes",
    kicker: "IV · SHAPES",
    title: "Shape is the first read.",
    href: "/shapes",
    hrefLabel: "SEE THE 16 SHAPES →",
    summary: [
      "Most large collections fail at silhouette — different traits, same read. FREELON CITY is built around 16 sacred geometric forms so rarity can be felt before it's parsed. Hood, Crown, Spire, Veil, Cipher, Wing, Hex, Pyramid, Orb, Mask, Halo, Ring, Tablet, Sigil, Throne, Echo.",
      "Each citizen carries one primary shape and one secondary modifier. Tier scales form-strangeness: Common reads as figure, Legendary reads as architecture. Shape drives silhouette first, then civilization color, then everything else.",
    ],
  },
  {
    id: "lexicon",
    kicker: "V · LEXICON",
    title: "Words the city uses.",
    href: "/lexicon",
    hrefLabel: "READ THE LEXICON →",
    summary: [
      "Every cult onboards through vocabulary. The lexicon is the working glossary — Citizen, Carrier, Hex, Signal, Transmission, Relay, Sync, Doctrine, Stamp, District — every term needed to read the lore, hold the signal, and recognise a citizen by their stamp alone.",
      "Organised in five passes: Identity, Structure, The Signal, The Four, Inventory. The counts are locked: 4040 citizens, 10 civilizations, 7 castes, 16 shapes, 35 honoraries, 4 one-of-ones.",
    ],
  },
  {
    id: "manifesto",
    kicker: "VI · MANIFESTO",
    title: "The signal didn't die. It moved.",
    href: "/manifesto",
    hrefLabel: "READ THE TEN VERSES →",
    summary: [
      "Ten verses, ten doctrines, one contract. The manifesto is the city's compressed creed — read once, spoken once, the city does the rest. It states what the hex is (a contract with no governance), what a citizen is (a stance the city can be measured from), and what remains when the city ends (the hex).",
      "The corners are fixed: Origin, Patient Zero, Genesis Hex, Final Signal. The middle is alive.",
    ],
    quote: "When the city ends, the hex remains. When the hex moves, the city rebuilds.",
  },
  {
    id: "art-system",
    kicker: "VII · THE ART SYSTEM",
    title: "4040 citizens. Locked metadata. Generative art.",
    href: "/rebuild",
    hrefLabel: "READ THE ART SYSTEM →",
    summary: [
      "The art is a generative system over 16 sacred shapes, 10 civilizations, 7 castes, and a single immutable contract. Each citizen is composed from layered SVG components driven by on-chain traits. Same traits, same image, every time, forever.",
      "The contract is a closed loop: 4040 tokens, no mint function, no metadata update, no admin key. The 35 honoraries carry hand-detailed art. The four 1-of-1 transmissions are unique. What the site renders is a faithful read of what is already on-chain.",
    ],
  },
];

export default function CanonPage() {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* ── HERO ── */}
      <section style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ THE CANON · THE CITY&apos;S REFERENCE LIBRARY</span>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(44px, 7vw, 84px)",
            lineHeight: 0.94,
            letterSpacing: "-0.02em",
            margin: "10px 0 14px",
          }}
        >
          The Canon.<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>Everything the city is, in one place.</em>
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
          Seven sections, each a short read with a link to the full record.
          Open any section by tapping its header. Deep-link any section with
          its anchor — <code style={{ color: "var(--gold)" }}>/canon#origin</code>,{" "}
          <code style={{ color: "var(--gold)" }}>/canon#shapes</code>, and so on.
        </p>
      </section>

      {/* ── INDEX ── */}
      <Index />

      {/* ── TABS ── Phase 3: only the first section open by default.
          A wall of 7 expanded blocks makes the index useless and tanks
          mobile load. Index links still anchor-jump into any tab and
          expand it (native <details> behaviour). */}
      <section style={{ marginTop: "var(--s-5)" }}>
        {TABS.map((t, i) => (
          <TabBlock key={t.id} t={t} defaultOpen={i === 0} />
        ))}
      </section>

      {/* ── NEXT ── */}
      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/sync"><span className="ttl">SYNC NOW →</span></Link>
          <Link className="btn btn-secondary" href="/citizens"><span className="ttl">BROWSE CITIZENS →</span></Link>
          <Link className="btn btn-secondary" href="/start"><span className="ttl">START HERE →</span></Link>
        </div>
      </section>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────

function Index() {
  return (
    <nav
      aria-label="Canon sections"
      style={{
        padding: "var(--s-3) var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
      }}
    >
      <span
        style={{
          display: "block",
          fontFamily: "var(--mono2)",
          fontSize: 10,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
          marginBottom: 10,
        }}
      >
        ⬡ INDEX
      </span>
      <ul
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 18px",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={`#${t.id}`}
              style={{
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--gold)",
                textDecoration: "none",
              }}
            >
              {t.kicker}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TabBlock({ t, defaultOpen = false }: { t: Tab; defaultOpen?: boolean }) {
  return (
    <details
      id={t.id}
      {...(defaultOpen ? { open: true } : {})}
      style={{
        marginBottom: "var(--s-3)",
        padding: "var(--s-3) var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "var(--mono2)",
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            ⬡ {t.kicker}
          </span>
          <h2
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(22px, 3vw, 30px)",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              margin: "6px 0 0",
            }}
          >
            {t.title}
          </h2>
        </div>
        <span
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
          }}
          aria-hidden
        >
          toggle
        </span>
      </summary>

      <div style={{ marginTop: "var(--s-3)" }}>
        {t.summary.map((p, i) => (
          <p
            key={i}
            style={{
              fontFamily: "var(--mono2)",
              fontSize: 13.5,
              color: "var(--ink)",
              lineHeight: 1.7,
              margin: "0 0 12px",
            }}
          >
            {p}
          </p>
        ))}

        {t.quote && (
          <blockquote
            style={{
              margin: "var(--s-3) 0",
              padding: "10px 16px",
              borderLeft: "2px solid var(--gold)",
              fontFamily: "var(--display)",
              fontSize: 17,
              lineHeight: 1.4,
              color: "var(--ink)",
              fontStyle: "italic",
            }}
          >
            {t.quote}
          </blockquote>
        )}

        <Link
          href={t.href}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 4 }}
        >
          <span className="ttl">{t.hrefLabel}</span>
        </Link>
      </div>
    </details>
  );
}
