import Link from "next/link";
import { CASTES } from "@/lib/constants";

export const metadata = { title: "7 Castes" };

export default function Page() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="terminal text-[var(--color-gold)] text-xs tracking-[0.3em]">SOCIAL HIERARCHY</div>
      <h1 className="mt-2 text-5xl font-light">Every city has a structure<br />Every citizen has a place</h1>
      <p className="mt-4 max-w-2xl text-[var(--color-ink-dim)]">7 castes derived deterministically from on-chain traits. Hex State + Tier determine where you stand.</p>

      <div className="mt-12 space-y-3">
        {Object.entries(CASTES).map(([name, c]) => (
          <div key={name} className="flex items-baseline justify-between p-6 rounded-lg border border-white/10 hover:border-[var(--color-gold)] transition-colors">
            <div className="flex-1">
              <div className="text-2xl font-light text-[var(--color-gold)] terminal">{name}</div>
              <div className="mt-1 text-[var(--color-ink-dim)] text-sm">{c.role}</div>
            </div>
            <div>
              <div className="terminal text-[var(--color-gold)] text-3xl">{c.count}</div>
              <div className="text-xs uppercase tracking-widest text-[var(--color-ink-dim)] text-right">citizens</div>
            </div>
          </div>
        ))}
      </div>

      <section style={{ marginTop: "var(--s-6)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/citizens"><span className="ttl">BROWSE BY CASTE →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">EXPLORE CIVILIZATIONS →</span></Link>
          <Link className="btn btn-secondary" href="/shapes"><span className="ttl">SEE THE 16 SHAPES →</span></Link>
        </div>
      </section>
    </div>
  );
}
