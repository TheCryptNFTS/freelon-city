import type { Metadata } from "next";
import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";
import { CivGlyph } from "@/components/CivGlyph";

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "Ten signal doctrines. Every citizen belongs to one civilization inside FREELON CITY.";
export const metadata: Metadata = {
  title: "Ten Civilizations",
  description: PAGE_DESC,
  openGraph: {
    title: "Ten Civilizations",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ten Civilizations",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

export default function Page() {
  return (
    <div className="civs-page">
      <section className="civs-hero">
        <span className="kicker">⬡ CIVILIZATIONS</span>
        <h1>10 <em>Signal</em> civilizations</h1>
        <p className="lead">
          Each citizen belongs to one. Population dictates power. Silver Machine at 80 is sacred.
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
