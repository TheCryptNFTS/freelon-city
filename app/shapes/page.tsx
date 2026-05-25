import { SHAPES, imageUrl } from "@/lib/constants";
import { getByShape } from "@/lib/citizens";
import Link from "next/link";

export const metadata = { title: "16 Sacred Shapes" };

export default function Page() {
  return (
    <div className="shapes-page">
      <section className="shapes-hero">
        <span className="kicker">⬡ THE SACRED SHAPES</span>
        <h1>Shape is the <em>first read</em></h1>
        <p className="lead">
          Most large collections fail at silhouette. Different traits, same read.
          FREELON CITY is built around 16 sacred geometric forms so rarity can be
          felt before it&apos;s read.
        </p>
      </section>
      <section className="shapes-grid">
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
                    <img src={imageUrl(c.id)} alt={`Citizen #${c.id}`} loading="lazy" />
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section style={{ marginTop: "var(--s-6)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/citizens"><span className="ttl">BROWSE BY SHAPE →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">EXPLORE CIVILIZATIONS →</span></Link>
          <Link className="btn btn-secondary" href="/castes"><span className="ttl">SEE THE 7 CASTES →</span></Link>
        </div>
      </section>
    </div>
  );
}
