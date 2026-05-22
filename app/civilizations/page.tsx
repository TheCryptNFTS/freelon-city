import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";

export const metadata = { title: "10 Civilizations" };

export default function Page() {
  return (
    <main className="civs-page">
      <section className="civs-hero">
        <span className="kicker">⬡ CIVILIZATIONS</span>
        <h1>10 <em>Signal</em> civilizations</h1>
        <p className="lead">
          Each citizen belongs to one. Population dictates power. Silver Machine at 80 is the rarest.
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
                <span className="stamp" style={{ color: c.color }}>{c.stamp}</span>
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
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">HOW TO EARN →</span></Link>
        </div>
      </section>
    </main>
  );
}
