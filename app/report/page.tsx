import type { Metadata } from "next";
import Link from "next/link";
import { getCivWeekStandings } from "@/lib/city-week";
import { topCitizens } from "@/lib/progression-store";
import { getCitizen } from "@/lib/citizens";
import { epithetFor } from "@/lib/epithets";
import { CIVILIZATIONS, imageUrl } from "@/lib/constants";
import { ReportShare } from "@/components/ReportShare";
import { ReferralBeacon } from "@/components/ReferralBeacon";

// THE SIGNAL REPORT — the weekly city ritual (the "spectatorship" keystone of the
// playable-identity loop). Reads the EXISTING hardened data: civ-wars standings
// (already note-injection-protected + ISO-week scoped) + the progression
// leaderboards. Read-only — no new economy surface. Empty-stadium safe: the
// notable-citizens spine is the all-time leaderboard (always populated if any
// citizen has history), and the civ-of-the-week falls back to a "quiet week"
// state rather than rendering a dead board.
export const revalidate = 600;

// Weekly OG card (2026-06-10): the unfurl shows THIS week's winner + count via
// /api/og/report — each week is a fresh URL so X/Discord scrapers re-fetch
// instead of serving a stale generic card. Fails soft to the quiet-week card.
export async function generateMetadata(): Promise<Metadata> {
  const title = "The Signal Report · FREELON CITY";
  let og = "/api/og/report";
  let description =
    "The weekly record of the city — which civilization pressed its claim, and the citizens who built a public life this week.";
  try {
    const civ = await getCivWeekStandings();
    const winner = civ.totalActive > 0 ? civ.standings[0] : null;
    let n = 0;
    try {
      const rows = await topCitizens("level", 12);
      for (const r of rows) {
        if (getCitizen(r.tokenId)) n++;
        if (n >= 8) break;
      }
    } catch { /* count stays 0 — the card renders its open-record state */ }
    og = `/api/og/report?w=${encodeURIComponent(civ.week)}&civ=${encodeURIComponent(winner?.name ?? "")}&c=${encodeURIComponent(winner?.color ?? "")}&n=${n}`;
    if (winner) {
      description = `${civ.week} — ${winner.name} pressed the strongest claim. The citizens building a public life, on the record.`;
    }
  } catch { /* fall through to the generic card */ }
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: og, width: 1200, height: 630 }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

type Notable = { tokenId: number; value: number; name: string; epithet: string | null; civColor: string; civName: string };

function buildNotables(rows: { tokenId: number; value: number }[], limit: number): Notable[] {
  const out: Notable[] = [];
  for (const r of rows) {
    const c = getCitizen(r.tokenId);
    if (!c) continue;
    const civ = (CIVILIZATIONS as Record<string, { color: string; name: string }>)[c.civilization];
    out.push({
      tokenId: r.tokenId,
      value: r.value,
      name: c.transmission_name || c.name || `Citizen #${r.tokenId}`,
      epithet: epithetFor(c),
      civColor: civ?.color || "var(--gold)",
      civName: civ?.name || c.civilization,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export default async function ReportPage() {
  const [civ, levelRows, jobRows, repRows] = await Promise.all([
    getCivWeekStandings(),
    topCitizens("level", 12),
    topCitizens("jobs", 5),
    topCitizens("rep", 5),
  ]);

  const notables = buildNotables(levelRows, 8);
  const mostActive = buildNotables(jobRows, 3);
  const highestStanding = buildNotables(repRows, 3);

  // The week's winner — most distinct participating citizens; only crown one if
  // a civ actually pressed a claim this week.
  const winner = civ.totalActive > 0 ? civ.standings[0] : null;
  const winnerDef = winner ? (CIVILIZATIONS as Record<string, { rival: string }>)[winner.slug] : null;
  const rival = winnerDef ? (CIVILIZATIONS as Record<string, { name: string; rivalLine: string }>)[winnerDef.rival] : null;
  const topCivs = civ.standings.filter((s) => s.active > 0).slice(0, 5);
  const maxActive = topCivs[0]?.active || 1;

  return (
    <div className="home-page" style={{ maxWidth: 1080, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* Ritual attribution — shared report links carry ?ref=sr-<week>; the
          beacon turns those arrivals into referral_landing events. */}
      <ReferralBeacon />
      {/* HERO */}
      <section className="field-glow" style={{ textAlign: "center", marginBottom: "var(--s-6)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ THE SIGNAL REPORT</span>
        <h1 className="page-h1">
          The week in the <em>city</em>.
        </h1>
        <p className="lead" style={{ maxWidth: 560, margin: "0 auto", color: "var(--ink-2)" }}>
          {civ.week} · who pressed their claim, and the citizens building a public life.
        </p>
      </section>

      {/* CIVILIZATION OF THE WEEK */}
      <section className="panel-premium" style={{ padding: "var(--s-5)", marginBottom: "var(--s-5)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ CIVILIZATION OF THE WEEK</span>
        {winner ? (
          <>
            <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(26px,4vw,42px)", margin: "8px 0 4px", color: winner.color }}>
              {winner.name}
            </h2>
            {rival && (
              <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 620 }}>
                Pressed the strongest claim this week. {rival.name} fell — <em style={{ color: "var(--ink)" }}>&ldquo;{rival.rivalLine}&rdquo;</em>
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "var(--s-4)" }}>
              {topCivs.map((s) => (
                <div key={s.slug} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 140, fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{s.name}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    {/* one-time grow-in (2026-06-10) — the "city moved" page was
                        dead-static; the standings now draw themselves on load. */}
                    <div className="report-bar-fill" style={{ width: `${Math.max(4, (s.active / maxActive) * 100)}%`, height: "100%", background: s.color, borderRadius: 999 }} />
                  </div>
                  <span style={{ width: 44, textAlign: "right", fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", flexShrink: 0 }}>{s.active}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, marginTop: 10, maxWidth: 600 }}>
            The frequency was quiet this week — no civilization pressed its claim. Send a
            citizen into the city and put your faction on the next report.{" "}
            <Link href="/citizens" style={{ color: "var(--gold)" }}>Choose a citizen →</Link>
          </p>
        )}
      </section>

      {/* CITIZENS OF NOTE — the spectatorship spine; all-time leaders so it's never empty */}
      <section style={{ marginBottom: "var(--s-5)" }}>
        <header className="sec-head" style={{ marginBottom: "var(--s-3)" }}>
          <span className="kicker">⬡ CITIZENS OF NOTE</span>
          <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(22px,3vw,32px)", margin: "6px 0" }}>
            The city&apos;s most <em style={{ color: "var(--gold)", fontStyle: "normal" }}>storied</em> citizens
          </h2>
        </header>
        {notables.length > 0 ? (
          <div className="ui-auto-fit-cards report-cards" style={{ ["--min-w" as string]: "200px" }}>
            {notables.map((n) => (
              <Link
                key={n.tokenId}
                href={`/citizens/${n.tokenId}`}
                className="panel-premium"
                style={{ display: "block", padding: 0, overflow: "hidden", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ aspectRatio: "1 / 1", borderBottom: `2px solid ${n.civColor}`, overflow: "hidden", background: "#0a0a0c" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(n.tokenId)} alt={n.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-dim)" }}>#{String(n.tokenId).padStart(4, "0")} · LV {n.value}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, lineHeight: 1.2 }}>{n.epithet || n.name}</div>
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 10.5, color: n.civColor, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{n.civName}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 600 }}>
            No citizen has built a record yet. The first to act writes the city&apos;s first page.{" "}
            <Link href="/citizens" style={{ color: "var(--gold)" }}>Be the first →</Link>
          </p>
        )}
      </section>

      {/* SIDE CALLOUTS — most active + highest standing */}
      {(mostActive.length > 0 || highestStanding.length > 0) && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--s-4)", marginBottom: "var(--s-5)" }}>
          {mostActive.length > 0 && (
            <div className="panel-premium" style={{ padding: "var(--s-4)" }}>
              <span className="kicker">⬡ MOST ACTIVE</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {mostActive.map((n) => (
                  <Link key={n.tokenId} href={`/citizens/${n.tokenId}`} style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "var(--ink)", fontFamily: "var(--mono2)", fontSize: 12 }}>
                    <span>{n.epithet || `#${String(n.tokenId).padStart(4, "0")}`}</span>
                    <span style={{ color: "var(--ink-dim)" }}>{n.value} missions</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {highestStanding.length > 0 && (
            <div className="panel-premium" style={{ padding: "var(--s-4)" }}>
              <span className="kicker">⬡ HIGHEST STANDING</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {highestStanding.map((n) => (
                  <Link key={n.tokenId} href={`/citizens/${n.tokenId}`} style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "var(--ink)", fontFamily: "var(--mono2)", fontSize: 12 }}>
                    <span>{n.epithet || `#${String(n.tokenId).padStart(4, "0")}`}</span>
                    <span style={{ color: "var(--ink-dim)" }}>{n.value} rep</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* CTA — the ritual action is the ONE gold here (2026-06-10): the report
          exists to be carried; distribution is the documented bottleneck.
          Holders posting the week's record IS the flywheel — sending a citizen
          stays one click away as the secondary. */}
      <section style={{ textAlign: "center" }}>
        <span className="kicker">⬡ CARRY THE SIGNAL</span>
        <div className="ui-cta-row" style={{ justifyContent: "center", marginTop: "var(--s-2)" }}>
          <ReportShare week={civ.week} winnerName={winner?.name ?? null} notableCount={notables.length} />
          <Link className="btn btn-secondary btn-lg" href="/citizens"><span className="ttl">SEND A CITIZEN →</span></Link>
        </div>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", marginTop: "var(--s-3)" }}>
          The city posts its record every Sunday. Every citizen builds a public life — its record travels with the NFT.
        </p>
      </section>
    </div>
  );
}
