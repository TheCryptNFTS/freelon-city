import Link from "next/link";
import type { Metadata } from "next";
import { getHonoraries } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tributes · 35 honoraries · FREELON CITY",
  description: "Each of these 35 citizens carries a name. Tag the signal carrier.",
};

export default function TributeIndex() {
  const hs = getHonoraries();
  return (
    <main className="tribute-index">
      <section className="tribute-hero">
        <span className="kicker">⬡ 35 TRIBUTES · NAMED AFTER THE SIGNAL CARRIERS</span>
        <h1>The <em>honoraries</em></h1>
        <p className="lead">
          35 citizens carry the name of a human who shaped the signal.
          Each has a pre-loaded tweet. Tag them. Tell them their citizen woke up.
        </p>
      </section>
      <section className="tribute-grid-wrap">
        <div className="tribute-grid">
          {hs.map((h) => {
            const handle = (h.honoree_handle || "").replace(/^@/, "");
            const civ = (CIVILIZATIONS as Record<string, { color: string; doctrine: string }>)[h.civilization];
            return (
              <Link
                key={h.id}
                href={`/tribute/${handle || h.id}`}
                className="tribute-cell scan-card"
                style={{ "--civ": civ?.color } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(h.id)} alt={h.honoree} loading="lazy" />
                <div className="meta">
                  <div className="id">#{h.id.toString().padStart(4, "0")}</div>
                  <div className="name">{h.honoree}</div>
                  <div className="handle">{h.honoree_handle}</div>
                  <div className="civ">{civ?.doctrine?.toUpperCase()}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: "var(--s-6)", maxWidth: "var(--maxw)", margin: "var(--s-6) auto 0", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/earn"><span className="ttl">THE LEDGER →</span></Link>
          <Link className="btn btn-secondary" href="/citizens"><span className="ttl">BROWSE ALL 4040 →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">EXPLORE CIVILIZATIONS →</span></Link>
        </div>
      </section>
    </main>
  );
}
