import type { Metadata } from "next";
import Link from "next/link";
import { getAllActive, type Tithe } from "@/lib/tithe-store";
import { CIVILIZATIONS } from "@/lib/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Patrons · FREELON CITY",
  description: "Citizens who have burned hex points to honor their civilization. Names live on the wall for 7 days.",
};

function shortAddr(a: string) {
  if (a.startsWith("handle:")) return `@${a.slice(7)}`;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function timeLeft(ts: number) {
  const ms = ts - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  return `${h}h`;
}

export default async function PatronsPage() {
  const all = await getAllActive();
  const civs = Object.entries(CIVILIZATIONS);
  const totalActive = Object.values(all).reduce((n, list) => n + list.length, 0);

  return (
    <main className="patrons-page" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad)" }}>
      <span className="kicker">⬡ THE PATRONS WALL · 7-DAY TITHES</span>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.94, letterSpacing: "-0.02em", marginTop: "var(--s-3)" }}>
        Names burned <em>into the city</em>
      </h1>
      <p className="lead" style={{ maxWidth: 680, marginTop: "var(--s-3)" }}>
        Burn hex points → your name appears here for 7 days, sorted by burn amount.
        It expires. The city remembers regardless. Minimum tithe: 100 ⬡.
      </p>

      {totalActive === 0 && (
        <section className="empty-hero">
          <span className="kicker">⬡ THE WALL IS BLANK</span>
          <h2 className="empty-hero-title">Be the first carved</h2>
          <p className="empty-hero-sub">No tithes yet across all 10 civilizations. The first names will hold the wall alone for 7 days.</p>
          <ol className="ghost-rows">
            <li><span>01</span><span className="ghost">YOUR NAME</span><span className="ghost">YOUR CIV</span><span className="ghost">100 ⬡</span></li>
            <li><span>02</span><span className="ghost">—</span><span className="ghost">—</span><span className="ghost">—</span></li>
            <li><span>03</span><span className="ghost">—</span><span className="ghost">—</span><span className="ghost">—</span></li>
          </ol>
        </section>
      )}

      <div style={{ display: "grid", gap: "var(--s-5)", marginTop: "var(--s-6)" }}>
        {civs.map(([slug, c]) => {
          const tithes = all[slug] || [];
          return (
            <section
              key={slug}
              className="patron-civ"
              style={{
                borderTop: `1px solid ${c.color}`,
                paddingTop: "var(--s-3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--s-3)" }}>
                <h2 style={{ color: c.color, fontFamily: "var(--display)", fontSize: 24, letterSpacing: "-0.005em" }}>
                  {c.name.toUpperCase()}
                </h2>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)" }}>
                  {tithes.length} patron{tithes.length === 1 ? "" : "s"}
                </span>
              </div>
              {tithes.length === 0 ? (
                <p style={{ color: "var(--ink-dim)", fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.16em" }}>
                  No tithes yet. Be the first to burn for this civ.
                </p>
              ) : (
                <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  {tithes.map((t: Tithe, i: number) => (
                    <li
                      key={t.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr auto auto",
                        alignItems: "baseline",
                        gap: "var(--s-3)",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontFamily: "var(--display)", fontSize: 18 }}>{t.display}</span>
                      <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)" }}>
                        {shortAddr(t.payerKey)}
                      </span>
                      <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: c.color }}>
                        {t.amount.toLocaleString()} ⬡ · {timeLeft(t.expiresAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>

      <section style={{ marginTop: "var(--s-6)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/carrier"><span className="ttl">BURN HEX FOR YOUR NAME →</span></Link>
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">EARN MORE HEX →</span></Link>
          <Link className="btn btn-secondary" href="/leaderboard"><span className="ttl">LEADERBOARD →</span></Link>
        </div>
      </section>
    </main>
  );
}
