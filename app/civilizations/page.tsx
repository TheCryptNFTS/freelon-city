import type { Metadata } from "next";
import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";
import { CivGlyph } from "@/components/CivGlyph";

// Phase 2 metadata 2026-05-27 — route-specific OG card (civilizations.jpg).
const PAGE_DESC =
  "Ten signal doctrines. Every citizen belongs to one civilization inside FREELON CITY.";
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
          Every citizen belongs to one. Your civilization is your color, your
          chant, your earning bonus, and the side you take when the city splits.
          Below: the ten, in order of population.
        </p>
      </section>
      <section className="civs-list">
        {Object.entries(CIVILIZATIONS).map(([slug, c]) => (
          <Link
            key={slug}
            href={`/civilizations/${slug}`}
            className="civ-card reveal has-plate relic-card scan-card"
            style={{
              "--civ": c.color,
              "--plate": `url(/civs/${slug}.webp)`,
            } as React.CSSProperties}
          >
            <header>
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
        ))}
      </section>

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
