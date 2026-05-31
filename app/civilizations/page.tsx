import type { Metadata } from "next";
import Link from "next/link";
import { CIVILIZATIONS, imageUrl, type CivilizationSlug } from "@/lib/constants";
import { getByCivilization } from "@/lib/citizens";
import { CivGlyph } from "@/components/CivGlyph";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { CastesSection } from "@/components/civilizations/CastesSection";
import { ShapesSection } from "@/components/civilizations/ShapesSection";

// A real citizen face for every civilization. The cards used to point at
// /civs/{slug}.webp plates that don't exist (404 → plain text + colour
// border). An NFT universe should SHOW its citizens, so each card now
// leads with an actual Freelon belonging to that civ — the highest-tier
// member (most exotic silhouette per the shape taxonomy), lowest id as a
// stable tie-break. 1/1s and honoraries are excluded so the face reads as
// a representative citizen, not a celebrity cameo.
const TIER_RANK: Record<string, number> = {
  Legendary: 5,
  Epic: 4,
  Rare: 3,
  Uncommon: 2,
  Common: 1,
};
function repFace(slug: string): number {
  const members = getByCivilization(slug as CivilizationSlug).filter(
    (c) => c.tier !== "One of One" && c.tier !== "Honorary",
  );
  if (!members.length) return 1;
  members.sort(
    (a, b) =>
      (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0) || a.id - b.id,
  );
  return members[0].id;
}

// Phase 2 metadata 2026-05-27 — route-specific OG card (civilizations.jpg).
const PAGE_DESC =
  "The full identity system of FREELON CITY: ten civilizations, seven castes, sixteen sacred shapes. Every citizen belongs to one of each.";
export const metadata: Metadata = {
  title: "Ten Civilizations",
  description: PAGE_DESC,
  openGraph: {
    title: "Ten Civilizations",
    description: PAGE_DESC,
    images: [{ url: "/og/civilizations.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ten Civilizations",
    description: PAGE_DESC,
    images: ["/og/civilizations.jpg"],
  },
};

export default function Page() {
  return (
    <div className="civs-page">
      <section className="civs-hero">
        {/* 2026-05-27 (post-Ogilvy down-funnel): h1 was taxonomic
           ("10 Signal civilizations" — told you the count, not the
           reason). New h1 answers "what do I get" — every citizen
           belongs to one of these; this is the doctrine you sit
           under, your color on every page, your earning bonus. The
           "Silver Machine at 80 is sacred" name-drop moved to the
           card grid where context exists; the lede now sells the
           membership instead. */}
        <span className="kicker">⬡ CIVILIZATIONS</span>
        <h1>Ten doctrines.<br /><em>One of them is yours.</em></h1>
        <p className="lead">
          Every <GlossaryTerm term="citizen">citizen</GlossaryTerm> belongs to
          one. Your <GlossaryTerm term="civilization">civilization</GlossaryTerm>{" "}
          is your color, your chant, your earning bonus, and the side you take
          when the city splits. Below: the ten, in order of population.
        </p>
      </section>

      {/* Sticky in-page sub-nav (2026-05-31): /castes and /shapes were folded
         into this page. Pure anchor links — SSR-friendly, no client tab state.
         Redirects from the old routes target the #castes / #shapes ids. */}
      <nav className="civ-subnav" aria-label="Identity system sections">
        <a href="#civilizations">Civilizations</a>
        <a href="#castes">Castes</a>
        <a href="#shapes">Shapes</a>
      </nav>

      <section id="civilizations" className="civs-list">
        {Object.entries(CIVILIZATIONS).map(([slug, c]) => {
          const faceId = repFace(slug);
          const face = imageUrl(faceId);
          return (
          <Link
            key={slug}
            href={`/civilizations/${slug}`}
            className="civ-card reveal has-plate relic-card scan-card"
            style={{
              "--civ": c.color,
              "--plate": `url(${face})`,
            } as React.CSSProperties}
          >
            <header>
              {/* Real citizen of this civ — the face the card represents. */}
              <span className="civ-face" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={face} alt="" loading="lazy" />
              </span>
              <div className="left">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <CivGlyph slug={slug} color={c.color} size={24} title={c.name} />
                  <span className="stamp" style={{ color: c.color }}>{c.stamp}</span>
                </div>
                <span className="full-name" style={{ color: c.color }}>{c.name}</span>
                <h2>{c.doctrine}</h2>
              </div>
              <div className="pop">{c.population}</div>
            </header>
            <p className="role">{c.role}</p>
            <div className="meta-row">
              <span className="essence">{c.essence}</span>
              <span className="chant">⬡ {c.chant}</span>
            </div>
          </Link>
          );
        })}
      </section>

      <CastesSection />

      <ShapesSection />

      <section style={{ marginTop: "var(--s-6)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/sync"><span className="ttl">FIND YOUR CIVILIZATION →</span></Link>
          <Link className="btn btn-secondary" href="/citizens"><span className="ttl">BROWSE ALL 4040 →</span></Link>
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">THE LEDGER →</span></Link>
        </div>
      </section>
    </div>
  );
}
