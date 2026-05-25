import type { Metadata } from "next";
import Link from "next/link";
import { getCivStandings } from "@/lib/civ-wars";
import { heroImageUrl } from "@/lib/constants";
import { MyCivStandings } from "@/components/MyCivStandings";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Civ Wars ⬡",
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

      {/* Phase 3: HOW SCORING WORKS lifted to right after hero.
          Rules before results — readers should know what they're
          looking at before the podium reveals who's winning. */}
      <section style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", borderRadius: 14, border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}>
        <span className="kicker">⬡ HOW SCORING WORKS</span>
        <ul style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", margin: "var(--s-2) 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Every active hex event (snipe, sale, sweep, listing bounty, naming burn) tagged with a token id scores for that citizen&apos;s civilization.</li>
          <li>Daily X claims and quest payouts are <em>neutral</em> — they don&apos;t score for any civ.</li>
          <li>Week resets every Monday 00:00 UTC.</li>
          <li>Winning civ earns +10% on all hex earnings the following week. Settles at week&apos;s end.</li>
        </ul>
      </section>

      {/* Personal: your civ allocation */}
      <MyCivStandings />

      {/* Podium — Phase 3: 1st place spans 2 columns at wide widths so
          the leading civ visually dominates. 2nd + 3rd share the right
          column. Collapses cleanly via .civ-podium grid below. */}
      {top && top.totalHex > 0 ? (
        <section className="civ-podium">
          {top3.map((c, i) => {
            const place = ["01 · 1ST", "02 · 2ND", "03 · 3RD"][i];
            const isFirst = i === 0;
            return (
              <article
                key={c.slug}
                className={isFirst ? "civ-podium__first" : "civ-podium__rest"}
                style={{
                  padding: isFirst ? "var(--s-5)" : "var(--s-4)",
                  borderRadius: 14,
                  border: `${isFirst ? "3" : "1"}px solid ${c.color}${isFirst ? "" : "88"}`,
                  background: `linear-gradient(180deg, ${c.color}${isFirst ? "22" : "15"} 0%, rgba(0,0,0,0.4) 100%)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: isFirst ? `0 0 60px -20px ${c.color}88` : "none",
                }}
              >
                <span style={{ fontFamily: "var(--mono2)", fontSize: isFirst ? 13 : 11, letterSpacing: "0.22em", color: c.color, fontWeight: 700 }}>{place}</span>
                <h2 style={{ fontFamily: "var(--display)", fontSize: isFirst ? 36 : 22, margin: 0, color: "var(--ink)", lineHeight: 1 }}>{c.name}</h2>
                <div style={{ fontFamily: "var(--display)", fontSize: isFirst ? 48 : 28, color: c.color, lineHeight: 1 }}>
                  {c.totalHex.toLocaleString()} <small style={{ fontSize: isFirst ? 22 : 14, color: "var(--ink-dim)" }}>⬡</small>
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
        <ol className="ui-table-stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {standings.map((c, i) => {
            const pct = totalScoredHex > 0 ? (c.totalHex / totalScoredHex) * 100 : 0;
            return (
              <li
                key={c.slug}
                className="ui-table-stack__row"
                style={{ ["--row-cols" as string]: "32px 1fr 100px 80px" }}
              >
                <span className="ui-table-stack__cell ui-table-stack__cell--rank">
                  <span className="ui-table-stack__label">Rank</span>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="ui-table-stack__cell" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                <span className="ui-table-stack__cell ui-table-stack__cell--num">
                  <span className="ui-table-stack__label">Hex</span>
                  {c.totalHex.toLocaleString()} ⬡
                </span>
                <span className="ui-table-stack__cell ui-table-stack__cell--num">
                  <span className="ui-table-stack__label">Share</span>
                  {pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Phase 3: rules block moved to top of page — no duplicate here. */}

      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/dashboard"><span className="ttl">SNIPE A RED SIGNAL →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">PICK YOUR CIV →</span></Link>
          <Link className="btn btn-secondary" href="/leaderboard"><span className="ttl">LEADERBOARD →</span></Link>
        </div>
      </section>
    </main>
  );
}
