import Link from "next/link";
import { CASTES } from "@/lib/constants";

export const metadata = { title: "7 Castes" };

export default function Page() {
  return (
    <main className="castes-page" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad)" }}>
      <section className="castes-hero">
        <span className="kicker">⬡ SOCIAL HIERARCHY · 7 CASTES</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.94, letterSpacing: "-0.02em", marginTop: "var(--s-3)" }}>
          Every city has a structure<br /><em>Every citizen has a place</em>
        </h1>
        <p className="lead" style={{ maxWidth: 640, marginTop: "var(--s-3)" }}>
          7 castes derived deterministically from on-chain traits. Hex State + Tier determine where you stand.
        </p>
      </section>

      <section style={{ marginTop: "var(--s-6)", display: "grid", gap: "var(--s-2)" }}>
        {Object.entries(CASTES).map(([name, c]) => (
          <article
            key={name}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "var(--s-4)",
              padding: "var(--s-4)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              transition: "border-color 160ms ease",
            }}
            className="caste-row"
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--display)", fontSize: 26, color: "var(--gold-bright)", letterSpacing: "0.02em", textTransform: "uppercase" }}>{name}</div>
              <div style={{ marginTop: 6, color: "var(--ink-2)", fontSize: 14 }}>{c.role}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 28, color: "var(--gold-bright)" }}>{c.count}</div>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>citizens</div>
            </div>
          </article>
        ))}
      </section>

      <section style={{ marginTop: "var(--s-6)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/citizens"><span className="ttl">BROWSE BY CASTE →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">EXPLORE CIVILIZATIONS →</span></Link>
          <Link className="btn btn-secondary" href="/shapes"><span className="ttl">SEE THE 16 SHAPES →</span></Link>
        </div>
      </section>
    </main>
  );
}
