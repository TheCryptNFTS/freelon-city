import Link from "next/link";
import { SHAPES, gridImageUrl } from "@/lib/constants";
import { getByShape } from "@/lib/citizens";

// Folded in from the former /shapes page (2026-05-31 consolidation).
// The 16 sacred geometric silhouettes — the first visual read of a citizen.
// Reuses the existing .shapes-grid / .shape-card CSS and getByShape() so the
// silhouette taxonomy (core brand IP) renders identically; only the wrapping
// <section id="shapes"> is new.
export function ShapesSection() {
  return (
    <section id="shapes" className="civ-fold">
      <span className="kicker">⬡ THE SACRED SHAPES · 16 FORMS</span>
      <h2 className="civ-fold__h">
        Shape is the <em>first read</em>
      </h2>
      <p className="lead">
        Most large collections fail at silhouette. Different traits, same read.
        FREELON CITY is built around 16 sacred geometric forms so rarity can be
        felt before it&apos;s read.
      </p>

      <div className="shapes-grid" style={{ marginTop: "var(--s-6)" }}>
        {Object.entries(SHAPES).map(([name, s]) => {
          const samples = getByShape(name).slice(0, 4);
          return (
            <article key={name} className="shape-card reveal">
              <header>
                <div className="left">
                  <h3>{name}</h3>
                  <span className="tier-tag">{s.tier}</span>
                </div>
                <div className="count">{s.count}</div>
              </header>
              <p className="lore">{s.lore}</p>
              <div className="samples">
                {samples.map((c) => (
                  <Link key={c.id} href={`/citizens/${c.id}`} className="sample">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gridImageUrl(c.id)} alt={`Citizen #${c.id}`} loading="lazy" />
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
