/**
 * Public, read-only progression record for a citizen. Server component — reads
 * the progression store directly so it's baked into the HTML and visible to
 * anyone (required for dashboard leaderboard links to land on a real record).
 * The owner-only "work a job" controls live in CitizenJobsBoard.
 */
import { getProgress, levelProgress, SKILL_KEYS } from "@/lib/progression-store";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { deriveSpec } from "@/lib/specialization";

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export async function CitizenProgressPanel({ tokenId }: { tokenId: number }) {
  const citizen = getCitizen(tokenId);
  if (!citizen) return null;
  const color = civilizationColor(citizen.civilization);
  const p = await getProgress(tokenId);
  const lp = levelProgress(p.xp);
  const pct = Math.round(lp.fraction * 100);
  const spec = deriveSpec(p);

  return (
    <section className="progress-panel" style={{ ["--civ" as string]: color }}>
      <span className="kicker">⬡ CITIZEN RECORD</span>

      <div className="spec-head">
        <span className="spec-class">{spec.cls === "drifter" ? "UNTRAINED" : spec.className.toUpperCase()}</span>
        {spec.cls !== "drifter" && <span className="spec-rank">{spec.rank.label}</span>}
        <span className="spec-cap">{spec.capability}</span>
        {spec.tuning.tunedFor && (
          <span className="spec-tuned">
            TUNED FOR · {spec.tuning.tunedFor.toUpperCase()}
            {spec.tuning.activityCount > 0 ? ` · ${spec.tuning.activityCount} LOGGED` : ""}
          </span>
        )}
      </div>

      <div className="progress-head">
        <div className="progress-level">
          <span className="progress-level-num">{p.level}</span>
          <span className="progress-level-lbl">LEVEL</span>
        </div>
        <div className="progress-xpwrap">
          <div className="progress-xpbar">
            <div className="progress-xpfill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-xpmeta">
            <span>{p.xp.toLocaleString()} XP</span>
            <span>{lp.toNext.toLocaleString()} TO LVL {p.level + 1}</span>
          </div>
        </div>
      </div>

      <div className="progress-stats">
        <div className="progress-stat">
          <span className="progress-stat-num">{p.reputation.toLocaleString()}</span>
          <span className="progress-stat-lbl">REPUTATION</span>
        </div>
        <div className="progress-stat">
          <span className="progress-stat-num">{p.jobsCompleted.toLocaleString()}</span>
          <span className="progress-stat-lbl">JOBS DONE</span>
        </div>
      </div>

      <div className="progress-skills">
        {SKILL_KEYS.map((k) => (
          <div className={`progress-skill${k === spec.dominantSkill ? " skill-primary" : ""}`} key={k}>
            <span className="progress-skill-lbl">{k}{k === spec.dominantSkill ? " ◆" : ""}</span>
            <span className="progress-skill-num">{p.skills[k] ?? 0}</span>
          </div>
        ))}
      </div>

      {p.memoryLog.length > 0 && (
        <div className="progress-memory">
          <span className="progress-memory-hdr">MEMORY LOG</span>
          <ul>
            {p.memoryLog.slice(0, 8).map((m, i) => (
              <li key={i} className={m.type === "levelup" ? "mem-levelup" : ""}>
                <span className="mem-when">{ago(m.timestamp)}</span>
                <span className="mem-desc">{m.description}</span>
                <span className="mem-delta">
                  {m.xpChange > 0 ? `+${m.xpChange} XP` : ""}
                  {m.signalChange > 0 ? ` +${m.signalChange} ⬡` : ""}
                  {m.signalChange < 0 ? ` ${m.signalChange} ⬡` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
