import type { Metadata } from "next";
import Link from "next/link";
import { getCivStandings } from "@/lib/civ-wars";
import { heroImageUrl } from "@/lib/constants";
import { MyCivStandings } from "@/components/MyCivStandings";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Civ Wars ⬡ · FREELON CITY",
  description: "Weekly civilization leaderboard. Most active hex earned wins +10% next cycle. Tribal mechanics in motion.",
};

export default async function CivWarsPage() {
  const { weekStart, standings, totalScoredHex } = await getCivStandings();
  const top = standings[0];
  const top3 = standings.slice(0, 3);

  return (
    <main className="civ-wars-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* Hero */}
      <section
        style={{
          padding: "var(--s-6) var(--s-5)",
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(90deg, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.5) 100%), url(/atmos/rebuild.webp) center / cover no-repeat",
          border: "1px solid var(--line-2)",
        }}
      >
        <span className="kicker" style={{ color: top?.color }}>⬡ CIV WARS · WEEK IN PROGRESS</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 0.95, margin: "10px 0 8px", letterSpacing: "-0.015em" }}>
          {top && top.totalHex > 0 ? (
            <>Leading: <em style={{ color: top.color, fontStyle: "normal" }}>{top.name}</em></>
          ) : (
            <>The race is <em style={{ color: "var(--gold)", fontStyle: "normal" }}>open</em></>
          )}
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", maxWidth: 520 }}>
          Every snipe, sale, and active hex event scores for the civilization of the citizen involved.
          Winning civ at week&apos;s end earns +10% on all earnings next cycle. Tribal.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "var(--s-4)", fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          <span>WEEK START · {new Date(weekStart).toISOString().slice(0, 10)}</span>
          <span>SCORED HEX · {totalScoredHex.toLocaleString()} ⬡</span>
          <span>RESETS · MONDAY 00:00 UTC</span>
        </div>
      </section>

      {/* Personal: your civ allocation */}
      <MyCivStandings />

      {/* Podium */}
      {top && top.totalHex > 0 ? (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--s-3)", margin: "var(--s-5) 0 var(--s-4)" }}>
          {top3.map((c, i) => {
            const place = ["🥇 1ST", "🥈 2ND", "🥉 3RD"][i];
            return (
              <article
                key={c.slug}
                style={{
                  padding: "var(--s-4)",
                  borderRadius: 14,
                  border: `2px solid ${c.color}88`,
                  background: `linear-gradient(180deg, ${c.color}15 0%, rgba(0,0,0,0.4) 100%)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: c.color, fontWeight: 600 }}>{place}</span>
                <h2 style={{ fontFamily: "var(--display)", fontSize: 24, margin: 0, color: "var(--ink)" }}>{c.name}</h2>
                <div style={{ fontFamily: "var(--display)", fontSize: 32, color: c.color, lineHeight: 1 }}>
                  {c.totalHex.toLocaleString()} <small style={{ fontSize: 16, color: "var(--ink-dim)" }}>⬡</small>
                </div>
                <div style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.12em" }}>
                  {c.events} event{c.events === 1 ? "" : "s"}
                  {c.topTokenId && (
                    <>
                      {" · TOP CITIZEN "}
                      <Link href={`/citizens/${c.topTokenId}`} style={{ color: c.color, textDecoration: "none" }}>
                        #{String(c.topTokenId).padStart(4, "0")}
                      </Link>
                    </>
                  )}
                </div>
                {c.topTokenId && (
                  <div style={{ marginTop: 4, borderRadius: 10, overflow: "hidden", border: `1px solid ${c.color}33` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroImageUrl(c.topTokenId)} alt={`#${c.topTokenId}`} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} loading="lazy" />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section style={{ margin: "var(--s-5) 0", padding: "var(--s-5)", border: "1px dashed var(--line-2)", borderRadius: 14, textAlign: "center" }}>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            No scoring events yet this week · be the first to snipe / sell / sweep a citizen of your civ
          </p>
        </section>
      )}

      {/* Full standings */}
      <section>
        <h2 className="kicker" style={{ marginBottom: 12 }}>⬡ ALL CIVILIZATIONS</h2>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {standings.map((c, i) => {
            const pct = totalScoredHex > 0 ? (c.totalHex / totalScoredHex) * 100 : 0;
            return (
              <li
                key={c.slug}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 100px 80px",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.18em" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <Link
                    href={`/civilizations/${c.slug}`}
                    style={{ fontFamily: "var(--display)", fontSize: 15, color: c.color, textDecoration: "none", letterSpacing: "-0.005em" }}
                  >
                    {c.name}
                  </Link>
                  <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: c.color, transition: "width 400ms ease" }} />
                  </div>
                </div>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink)", textAlign: "right" }}>
                  {c.totalHex.toLocaleString()} ⬡
                </span>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.12em", textAlign: "right" }}>
                  {pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* How it works */}
      <section style={{ marginTop: "var(--s-6)", padding: "var(--s-4)", borderRadius: 14, border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}>
        <span className="kicker">⬡ HOW SCORING WORKS</span>
        <ul style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", margin: "var(--s-2) 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Every active hex event (snipe, sale, sweep, listing bounty, naming burn) tagged with a token id scores for that citizen&apos;s civilization.</li>
          <li>Daily X claims and quest payouts are <em>neutral</em> — they don&apos;t score for any civ.</li>
          <li>Week resets every Monday 00:00 UTC.</li>
          <li>Winning civ earns +10% on all hex earnings the following week. Settles at week&apos;s end.</li>
        </ul>
      </section>

      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary" href="/dashboard"><span className="ttl">SNIPE A RED SIGNAL →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">PICK YOUR CIV →</span></Link>
          <Link className="btn btn-secondary" href="/leaderboard"><span className="ttl">LEADERBOARD →</span></Link>
        </div>
      </section>
    </main>
  );
}
