import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getCivWeekStandings } from "@/lib/city-week";
import { topCitizens, getProgress, type CitizenProgress } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { getCitizen } from "@/lib/citizens";
import { epithetFor } from "@/lib/epithets";
import { CIVILIZATIONS, imageUrl } from "@/lib/constants";

// THIS WEEK IN THE CITY — homepage teaser for the Signal Report (/report).
// The public-life story rendered where cold traffic actually walks: winner civ +
// the three most storied citizens, one link to the full weekly report. Reuses
// /report's hardened read-only queries (civ-week standings + progression
// leaderboard) — no new economy surface. Self-hides until at least one citizen
// has a record (empty-stadium rule), and fails to nothing rather than taking
// the homepage down with it.

type Notable = {
  tokenId: number;
  level: number;
  name: string;
  epithet: string | null;
  civColor: string;
  civName: string;
  role: string | null; // derived specialization className, null for untrained
  jobs: number; // completed-job count; 0 = omit the segment
};

// The homepage is force-dynamic, so without this every single view paid ~11
// Upstash REST round-trips (10 SCARD + 1 ZREVRANGE) just for this band —
// enough to exhaust a free-tier command budget on bot traffic alone
// (red-team 2026-06-10). Cache the reads at /report's own 600s freshness:
// the band is a teaser, not a live scoreboard. Errors are not cached, so the
// fail-to-null behavior below is preserved.
const getBandData = unstable_cache(
  async () => {
    const [civ, levelRows] = await Promise.all([getCivWeekStandings(), topCitizens("level", 6)]);
    // Progression for the 3 notables only (role + job count on the card meta
    // line — same getProgress/deriveSpec path /citizens uses). Resolved INSIDE
    // this 600s cache so a warm hit still costs zero Upstash commands; +3 GETs
    // per cold fill. Notable selection mirrors the render loop below.
    const notableIds: number[] = [];
    for (const r of levelRows) {
      if (!getCitizen(r.tokenId)) continue;
      notableIds.push(r.tokenId);
      if (notableIds.length >= 3) break;
    }
    const progress = await Promise.all(notableIds.map((id) => getProgress(id)));
    return { civ, levelRows, progress };
  },
  ["city-week-band", "v2"], // v2: return shape changed (object + progression)
  { revalidate: 600 },
);

export async function CityWeekBand() {
  let winnerName: string | null = null;
  let winnerColor: string | null = null;
  let week = "";
  const notables: Notable[] = [];
  try {
    const { civ, levelRows, progress } = await getBandData();
    week = civ.week;
    const winner = civ.totalActive > 0 ? civ.standings[0] : null;
    if (winner) {
      winnerName = winner.name;
      winnerColor = winner.color;
    }
    const progByToken = new Map<number, CitizenProgress>(progress.map((p) => [p.tokenId, p]));
    for (const r of levelRows) {
      const c = getCitizen(r.tokenId);
      if (!c) continue;
      const civDef = (CIVILIZATIONS as Record<string, { color: string; name: string }>)[c.civilization];
      const prog = progByToken.get(r.tokenId);
      const spec = prog ? deriveSpec(prog) : null;
      notables.push({
        tokenId: r.tokenId,
        level: r.value,
        name: c.transmission_name || c.name || `Citizen #${r.tokenId}`,
        epithet: epithetFor(c),
        civColor: civDef?.color || "var(--gold)",
        civName: civDef?.name || c.civilization,
        role: spec && spec.cls !== "drifter" ? spec.className : null,
        jobs: prog?.jobsCompleted ?? 0,
      });
      if (notables.length >= 3) break;
    }
  } catch {
    return null;
  }
  if (notables.length === 0) return null;

  return (
    <section className="reveal" aria-label="This week in the city" style={{ maxWidth: 1080, margin: "0 auto", padding: "var(--s-6) var(--s-4) 0" }}>
      <div className="panel-premium panel-premium--feature" style={{ padding: "var(--s-5)" }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div>
            <span className="kicker" style={{ color: "var(--gold)" }}>⬡ THIS WEEK IN THE CITY</span>
            <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(22px,3vw,32px)", margin: "6px 0 0" }}>
              The city keeps a <em style={{ color: "var(--gold)", fontStyle: "normal" }}>public record</em>.
            </h2>
          </div>
          <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.12em", color: "var(--ink-dim)", textTransform: "uppercase" }}>{week}</span>
        </header>

        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: "10px 0 0", maxWidth: 640 }}>
          {winnerName ? (
            <>
              <strong style={{ color: winnerColor ?? "var(--gold)" }}>{winnerName}</strong> pressed the strongest claim this week.
              These citizens are building lives anyone can see — every job, level and memory stays on the token&apos;s record.
            </>
          ) : (
            <>These citizens are building lives anyone can see — every job, level and memory stays on the token&apos;s record.</>
          )}
        </p>

        <div className="ui-auto-fit-cards" style={{ ["--min-w" as string]: "180px", marginTop: "var(--s-4)" }}>
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
                <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
                  #{String(n.tokenId).padStart(4, "0")} · LV {n.level}
                  {n.role ? ` · ${n.role}` : ""}
                  {n.jobs > 0 ? ` · ${n.jobs} ${n.jobs === 1 ? "JOB" : "JOBS"}` : ""}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, lineHeight: 1.2 }}>{n.epithet || n.name}</div>
                <div style={{ fontFamily: "var(--mono2)", fontSize: 10.5, color: n.civColor, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{n.civName}</div>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ margin: "var(--s-4) 0 0" }}>
          <Link href="/report" style={{ color: "var(--gold)", fontFamily: "var(--mono2)", fontSize: 13, letterSpacing: "0.06em", textDecoration: "none" }}>
            Read The Signal Report — the week&apos;s full record →
          </Link>
        </p>
      </div>
    </section>
  );
}
