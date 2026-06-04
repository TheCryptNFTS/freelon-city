/**
 * ProgressionSection — top citizens by level / reputation / jobs completed.
 * Server component. Reads the progression sorted sets via topCitizens()
 * (ZREVRANGE — exact top-N, never a SCAN), so it stays correct across all
 * 4040 citizens. Sibling of EarnersSection in the /dashboard hub.
 */
import Link from "next/link";
import { topCitizens, type LeaderboardRow } from "@/lib/progression-store";
import { getCitizen } from "@/lib/citizens";

function label(tokenId: number): string {
  const c = getCitizen(tokenId);
  const id4 = tokenId.toString().padStart(4, "0");
  if (c?.transmission_name) return `#${id4} · ${c.transmission_name}`;
  if (c?.honoree) return `#${id4} · ${c.honoree}`;
  return `#${id4}`;
}

function List({ rows, unit, emptyHook }: { rows: LeaderboardRow[]; unit: string; emptyHook: string }) {
  if (rows.length === 0) {
    return (
      <ol className="lb-list ghost-list">
        <li><span className="lb-rank">01</span><span className="lb-addr ghost">NO CITIZEN YET</span><span className="lb-amt ghost">—</span></li>
        <li><span className="lb-rank">02</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
        <li><span className="lb-rank">03</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
        <li className="ghost-cta">{emptyHook}</li>
      </ol>
    );
  }
  return (
    <ol className="lb-list">
      {rows.map((r, i) => (
        <li key={r.tokenId}>
          <span className="lb-rank">{String(i + 1).padStart(2, "0")}</span>
          <Link href={`/citizens/${r.tokenId}`} className="lb-addr">{label(r.tokenId)}</Link>
          <span className="lb-amt">{r.value.toLocaleString()} {unit}</span>
        </li>
      ))}
    </ol>
  );
}

export async function ProgressionSection() {
  const [byLevel, byRep, byJobs] = await Promise.all([
    topCitizens("level", 50).catch(() => []),
    topCitizens("rep", 50).catch(() => []),
    topCitizens("jobs", 50).catch(() => []),
  ]);

  return (
    <section id="progression" className="leaderboard-page" style={{ scrollMarginTop: 96 }}>
      <section className="page-hero">
        <span className="kicker">⬡ CITIZEN PROGRESSION</span>
        <h2>Citizens the city <em>remembers</em></h2>
        <p className="lead">
          Every job worked grows a citizen&apos;s level, reputation, and record. Progression lives on the
          citizen — it <strong style={{ color: "var(--gold)" }}>survives a sale</strong>.
        </p>
      </section>

      <div className="lb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--s-4)" }}>
        <section>
          <h3 className="kicker" style={{ color: "var(--gold)" }}>⬡ HIGHEST LEVEL</h3>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em", marginTop: 4, marginBottom: 12 }}>
            XP EARNED FROM JOBS
          </p>
          <List rows={byLevel} unit="LVL" emptyHook="No citizen has leveled yet · be the first." />
        </section>

        <section>
          <h3 className="kicker">⬡ MOST REPUTABLE</h3>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em", marginTop: 4, marginBottom: 12 }}>
            REPUTATION FROM COMPLETED WORK
          </p>
          <List rows={byRep} unit="REP" emptyHook="The record is blank · earn the city's trust." />
        </section>

        <section>
          <h3 className="kicker">⬡ MOST JOBS DONE</h3>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em", marginTop: 4, marginBottom: 12 }}>
            TOTAL JOBS COMPLETED
          </p>
          <List rows={byJobs} unit="JOBS" emptyHook="No work logged yet · clock in." />
        </section>
      </div>
    </section>
  );
}
