/**
 * The AGENT RÉSUMÉ — the first screen of a FREELON page answers, at a glance:
 * what is this, who owns it, what level/role is it, what has it done, and how do
 * you use it. A trainable agent's profile, not just an NFT card.
 *
 * Server component — reads the progression store directly so the résumé is baked
 * into the HTML (visible to logged-out buyers and OG bots, survives sale). PURE
 * spec data + two fail-quiet enrichments (on-chain owner, accumulated hex) that
 * degrade to "—" if a source is slow. No owner gate — a résumé is public by
 * design. The owner-only controls live in CitizenAgentDashboard (#run) below.
 */
import Link from "next/link";
import { getProgress, levelProgress } from "@/lib/progression-store";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { deriveSpec, isPrestige } from "@/lib/specialization";
import { ownerOf } from "@/lib/owner-of";
import { CIVILIZATIONS } from "@/lib/constants";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function CitizenResume({ tokenId }: { tokenId: number }) {
  const citizen = getCitizen(tokenId);
  if (!citizen) return null;
  const color = civilizationColor(citizen.civilization);
  const civName = (CIVILIZATIONS as Record<string, { name: string }>)[citizen.civilization]?.name;

  const p = await getProgress(tokenId);
  const spec = deriveSpec(p);
  const lp = levelProgress(p.xp);
  const pct = Math.round(lp.fraction * 100);
  const untrained = spec.cls === "drifter";
  const purityPct = Math.round(spec.purity * 100);

  // Fail-quiet enrichments — a slow RPC / Redis hiccup must never break the page.
  const [owner, hexEarned, unlock, paymentsLive] = await Promise.all([
    ownerOf(tokenId).catch(() => null),
    (async () => {
      try {
        const { getCitizenStats } = await import("@/lib/citizen-value-store");
        return (await getCitizenStats(tokenId)).hex ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { unlockStatus } = await import("@/lib/missions/unlock-store");
        return await unlockStatus(tokenId);
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        return (await import("@/lib/missions/pricing")).PAYMENTS_LIVE;
      } catch {
        return false;
      }
    })(),
  ]);

  return (
    <section className="resume" style={{ ["--civ" as string]: color }}>
      <div className="resume-hd">
        <span className="kicker">⬡ AGENT RÉSUMÉ</span>
        {p.demo ? (
          <span className="resume-demo" title="An example of what a trained FREELON looks like — not real holder activity. Real agents build history through use; the first real job replaces this.">
            SHOWCASE · EXAMPLE ONLY
          </span>
        ) : (
          !untrained && spec.purity >= 0.6 && spec.dominantPoints >= 10 && (
            <span className="resume-purity" title="Share of XP in its dominant skill — how specialized this agent is.">
              {purityPct}% SPECIALIZED
            </span>
          )
        )}
      </div>

      {/* IDENTITY STRIP — who owns it · its civilization · its status. Answers
          "who owns this / is it active" before anything else. */}
      <div className="resume-id">
        <span className="resume-id-cell">
          <span className="resume-id-lbl">OWNED BY</span>
          {owner ? (
            <Link href={`/wallet/${owner}`} className="resume-id-val resume-id-link">{short(owner)}</Link>
          ) : (
            <span className="resume-id-val">—</span>
          )}
        </span>
        {civName && (
          <span className="resume-id-cell">
            <span className="resume-id-lbl">CIVILIZATION</span>
            <span className="resume-id-val">{civName}</span>
          </span>
        )}
        <span className="resume-id-cell">
          <span className="resume-id-lbl">STATUS</span>
          <span className={`resume-status ${untrained ? "is-new" : "is-active"}`}>
            {untrained ? "○ AWAITING FIRST JOB" : "● ACTIVE"}
          </span>
        </span>
        {/* PREMIUM ACTIVATION — only shown once payments are live, so it's part
            of the buyer pitch ("this agent can be activated for X ETH"). */}
        {paymentsLive && unlock && (
          <span className="resume-id-cell">
            <span className="resume-id-lbl">PREMIUM</span>
            {unlock.unlocked ? (
              <span className="resume-unlock is-on" title="Premium abilities (deep Strategy, Red Team, Dossier & images) are activated on this FREELON — permanently. Premium runs remaining.">
                ⬡ ACTIVATED · {unlock.credits.toLocaleString()} RUNS LEFT
              </span>
            ) : (
              <span className="resume-unlock is-off" title="The owner can activate premium abilities (deep Strategy, Red Team, Dossier & images) with a one-time payment, priced by rarity. Activation is permanent and stays with the NFT. Common FREELONS activate from 0.005 ETH.">
                ○ ACTIVATE · {unlock.priceEth} ETH
                {unlock.priceEth > 0.005 && (
                  <span className="resume-unlock-ctx"> (commons from 0.005)</span>
                )}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="resume-title">
        <span className="resume-class">
          {untrained ? "UNTRAINED AGENT" : spec.className.toUpperCase()}
        </span>
        {!untrained && (
          <span className={`resume-rank${isPrestige(spec.rank) ? " is-prestige" : ""}`}>
            {spec.rank.label.toUpperCase()}
          </span>
        )}
        <span className="resume-level">LV {p.level}</span>
      </div>

      <p className="resume-line">
        {untrained ? (
          <>No specialty yet — give this FREELON a job and it builds a role and a visible work history.</>
        ) : (
          <>
            {spec.tuning.tunedFor && (
              <>Tuned for <strong>{spec.tuning.tunedFor}</strong> · </>
            )}
            {spec.resume.trackRecord && <><strong>{spec.resume.trackRecord}</strong> · </>}
            {spec.capability}
          </>
        )}
      </p>

      <div className="resume-stats">
        <div className="resume-stat">
          <span className="resume-stat-num">{spec.dominantPoints.toLocaleString()}</span>
          <span className="resume-stat-lbl">{untrained ? "SKILL PTS" : spec.resume.outputNoun.toUpperCase()}</span>
        </div>
        <div className="resume-stat">
          <span className="resume-stat-num">{(spec.tuning.activityCount).toLocaleString()}</span>
          <span className="resume-stat-lbl">JOBS DONE</span>
        </div>
        <div className="resume-stat">
          <span className="resume-stat-num">{p.reputation.toLocaleString()}</span>
          <span className="resume-stat-lbl">REPUTATION</span>
        </div>
        <div className="resume-stat">
          <span className="resume-stat-num">{hexEarned.toLocaleString()} ⬡</span>
          <span className="resume-stat-lbl">HEX ACCUMULATED</span>
        </div>
      </div>

      <div className="resume-xpwrap">
        <div className="resume-xpbar"><div className="resume-xpfill" style={{ width: `${pct}%` }} /></div>
        <span className="resume-xpmeta">{p.xp.toLocaleString()} XP · {lp.toNext.toLocaleString()} TO LV {p.level + 1}</span>
      </div>

      <p className="resume-bestfor">BEST FOR · {spec.resume.bestFor.toUpperCase()}</p>

      {/* THE USE — the obvious "how do I use this" action, on the first screen.
          Scrolls to the owner dashboard (#run), which gates to the holder. */}
      <a className="btn btn-primary resume-cta" href="#run">
        <span className="ttl">{untrained ? "GIVE THIS FREELON ITS FIRST JOB →" : "GIVE THIS FREELON A JOB →"}</span>
      </a>
    </section>
  );
}
