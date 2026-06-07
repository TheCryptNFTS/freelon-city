import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCitizen, countSimilar, civilizationColor, getIdentity } from "@/lib/citizens";
import { imageUrl, openseaUrl, CIVILIZATIONS } from "@/lib/constants";
import { ShareButtons } from "@/components/ShareButtons";
import { CitizenDeepLore } from "@/components/CitizenDeepLore";
import { QuestTracker } from "@/components/QuestTracker";
import { CitizenOwnedByYou } from "@/components/CitizenOwnedByYou";
import { WatchlistButton } from "@/components/WatchlistButton";
import { CitizenNameEditor } from "@/components/CitizenNameEditor";
import { CitizenRealignEditor } from "@/components/CitizenRealignEditor";
import { CitizenProgressPanel } from "@/components/CitizenProgressPanel";
import { CitizenJobsBoard } from "@/components/CitizenJobsBoard";
import { CitizenMissionsBoard } from "@/components/CitizenMissionsBoard";
import { CitizenCheckIn } from "@/components/CitizenCheckIn";
import { CitizenResume } from "@/components/CitizenResume";
import { CitizenAgentExplainer } from "@/components/CitizenAgentExplainer";
import { CitizenAgentDashboard } from "@/components/CitizenAgentDashboard";
import { ActivationProof } from "@/components/ActivationProof";
import { EvolvePanel } from "@/components/EvolvePanel";
import YourStable from "@/components/YourStable";
import { getCheckIn } from "@/lib/daily-checkin";
import { getRankByLevel } from "@/lib/progression-store";
import { getDeepLore, unlockCost } from "@/lib/deep-lore";
import { getName } from "@/lib/name-store";
import { getRealignment } from "@/lib/realignment-store";
import { epithetFor } from "@/lib/epithets";
import { rarityRank } from "@/lib/rarity";
import { getCitizenMeta, type CitizenMeta } from "@/lib/citizen-meta";
import { tweetTribute, tweetIntent } from "@/lib/share";
import { getGhost, getRescue } from "@/lib/ghost-store";
import { getAgentHistory } from "@/lib/agent-history";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return { title: "Not found" };
  const ogUrl = `/api/og/${tid}`;
  const title = c.transmission_name
    ? `#${tid.toString().padStart(4,"0")} · ${c.transmission_name}`
    : c.honoree
    ? `Honorary · ${c.honoree}`
    : `Citizen #${tid.toString().padStart(4,"0")}`;
  return {
    title,
    description: `${c.shape} · ${c.civilization.replace("-", " ")} · ${c.caste} · ${c.tier}`,
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

const FIELDS: Array<{ key: keyof CitizenLike; label: string }> = [
  { key: "caste",        label: "Caste" },
  { key: "shape",        label: "Shape" },
  { key: "hex_state",    label: "Hex state" },
  { key: "signal_type",  label: "Signal type" },
  { key: "face_status",  label: "Face status" },
  { key: "glow_level",   label: "Glow level" },
  { key: "sub_archetype",label: "Sub-archetype" },
];

type CitizenLike = {
  caste: string; shape: string; hex_state: string;
  signal_type: string; face_status: string; glow_level: string;
  sub_archetype: string; aura: string;
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) notFound();

  const counts = countSimilar(c);
  const color = civilizationColor(c.civilization);
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string; population: number }>)[c.civilization];
  const id4 = tid.toString().padStart(4, "0");
  const identity = getIdentity(tid);
  const customName = await getName(tid).catch(() => null);
  const realign = await getRealignment(tid).catch(() => null);
  const alignedCivDef = realign
    ? (CIVILIZATIONS as Record<string, { name: string }>)[realign.alignedCiv]
    : null;
  const cleanHandle = (c.honoree_handle || "").replace(/^@/, "");

  // Daily check-in (today's line if already generated) + level rank — both cheap,
  // both fail-quiet so they never block the profile render.
  const [todayCheckIn, levelRank, agentWorkCount] = await Promise.all([
    getCheckIn(tid).catch(() => null),
    getRankByLevel(tid).catch(() => null),
    // Only surface the "VIEW PUBLIC WORK LOG" button when the log actually has
    // entries — otherwise it dead-ends on the "No public work yet" empty state
    // (true for any citizen without real holder activity). Fail-quiet to 0.
    getAgentHistory(tid).then((h) => h.length).catch(() => 0),
  ]);

  const rank = rarityRank(tid);
  const meta = await Promise.race<CitizenMeta>([
    getCitizenMeta(tid),
    new Promise<CitizenMeta>((r) =>
      setTimeout(() => r({ daysHeld: null, lastSaleEth: null, lastSaleTs: null }), 6000)
    ),
  ]);

  // Per-citizen accumulated hex + civ rank (built 2026-05-25, founder spec).
  // The store is updated by the sweep-bounty cron when a sale touches this
  // token. Civ rank = position by computed value within same civilization.
  // Fail-quiet wrapper so an Upstash hiccup never breaks the citizen page.
  const valueCard = await (async () => {
    try {
      const {
        getCitizenStats,
        computeCitizenValue,
        getCitizenCivRank,
        citizenAgeTicks,
        acceptanceTier,
      } = await import("@/lib/citizen-value-store");
      const floor = typeof meta.lastSaleEth === "number" && meta.lastSaleEth > 0
        ? meta.lastSaleEth
        : 0.003; // fallback floor used only for sale ratio; harmless if wrong
      const stats = await getCitizenStats(tid);
      const computed = computeCitizenValue(tid, stats, floor);
      const civRank = await getCitizenCivRank(tid, floor).catch(() => null);
      const age = citizenAgeTicks(stats);
      const tier = acceptanceTier(computed.value);
      return { stats, computed, civRank, age, tier };
    } catch {
      return null;
    }
  })();

  // Ghost / rescue status — server-side so the SIGNAL LOST state is baked
  // into the HTML and survives no-JS / OG bots.
  const ghost = await getGhost(tid).catch(() => null);
  const isGhosted = !!(ghost && ghost.status === "ghosted" && Date.now() >= ghost.ghostedAt);
  const rescue = !isGhosted ? await getRescue(tid).catch(() => null) : null;
  const ghostPct = ghost ? Math.round(ghost.discount * 100) : null;

  return (
    <div className="citizen-page" style={{ "--civ": color } as React.CSSProperties}>
      <article className="citizen-grid">
        <aside className="citizen-image">
          <div className="img-shell relic-card" style={isGhosted ? { background: "#050505", aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#888", fontFamily: "var(--mono2)", letterSpacing: "0.28em", textTransform: "uppercase" } : undefined}>
            {isGhosted ? (
              <>
                <div style={{ fontSize: 14, color: "#aaa" }}>⬡ 404</div>
                <div style={{ fontSize: 18, color: "#ccc", marginTop: 10 }}>SIGNAL LOST</div>
                <div style={{ fontSize: 11, color: "#b8423d", marginTop: 14, letterSpacing: "0.2em" }}>
                  DUMPED · {ghostPct}% UNDER FLOOR
                </div>
                <div style={{ fontSize: 9, color: "#6a6a6a", marginTop: 24, maxWidth: 280, textAlign: "center", lineHeight: 1.6, letterSpacing: "0.14em" }}>
                  THE CITY NO LONGER RECOGNIZES THIS CITIZEN. A RESCUER WHO BUYS BELOW FLOOR REINSTATES THE SIGNAL AND COLLECTS A BOUNTY.
                </div>
              </>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageUrl(tid)} alt={c.name} />
            )}
          </div>
          <div className="img-meta">
            <span className="big-id">#{id4}</span>
            <span className="big-tier" style={{ color: isGhosted ? "#5a5a5a" : color }}>
              {isGhosted ? "GHOSTED" : c.tier}
            </span>
          </div>
          {rescue && (
            <div style={{ marginTop: "var(--s-3)", padding: "10px 12px", border: "1px solid #2a5a3a", background: "rgba(20,40,30,0.4)", fontFamily: "var(--mono2)", fontSize: 11, color: "#9ad4a8", letterSpacing: "0.14em" }}>
              ⬡ RESCUED · permanent attribution to {rescue.rescuer.slice(0, 6)}…{rescue.rescuer.slice(-4)} · +{rescue.hexPaid}⬡
            </div>
          )}
        </aside>

        <section className="citizen-body">
          <span className="stamp">⬡ FREELON CITY · CITIZEN #{id4}</span>
          <CitizenOwnedByYou citizenId={tid} />
          {customName?.name && <div className="custom-name">{customName.name}</div>}
          {c.transmission_name && <h1>{c.transmission_name}</h1>}
          {c.honoree && !c.transmission_name && (
            <>
              <h1>{c.honoree}</h1>
              {c.honoree_handle && (
                <a className="honoree-handle" href={`https://twitter.com/${cleanHandle}`} target="_blank" rel="noreferrer">
                  {c.honoree_handle} ↗
                </a>
              )}
            </>
          )}
          {!c.transmission_name && !c.honoree && <h1>Citizen #{id4}</h1>}
          {(() => {
            const epithet = epithetFor(c);
            return epithet ? (
              <div className="citizen-epithet" style={{ color }}>{epithet}</div>
            ) : null;
          })()}

          <div className="civ-line" style={{ color }}>
            <span className="dot" />
            {civ?.name?.toUpperCase()} · {c.doctrine?.toUpperCase()}
          </div>
          {realign && alignedCivDef && (
            <div className="realigned-badge">
              ⬡ ALIGNED TO {alignedCivDef.name.toUpperCase()}
            </div>
          )}
          {/* THE AGENT LEADS — 2026-06-03: the whole pitch ("your NFT is an AI
              agent") now sits at the TOP of the citizen page, above the lore.
              Newcomers see what it IS and what it does before the backstory. */}
          {/* Lead with the PITCH in plain words → show it work → let them DO it
              → then the record. (Restructured 2026-06-03: the page used to open
              on an empty stat block; now a stranger gets it in one line.) */}
          <p className="agent-lede">
            This NFT is an <strong>AI character you own</strong> — it remembers you, builds a work
            history that stays with the NFT, and grows as you train it.
          </p>
          {/* Unlock primer (2026-06-07): state the whole loop — including the one
              paid step — in one line before the dashboard, so the ETH unlock isn't
              a surprise. Comprehension ceiling-raiser. */}
          <p className="agent-lede" style={{ color: "var(--ink-dim)", fontSize: 13 }}>
            Unlock it once with ETH to switch the agent on — yours forever, even if you sell — then spend ⬡ to give it jobs.
          </p>
          {/* Social proof — real strangers have already unlocked. Self-hides at 0. */}
          <div style={{ margin: "var(--s-3) 0" }}>
            <ActivationProof compact />
          </div>
          {/* RÉSUMÉ LEADS (2026-06-03 founder brief): the first screen must answer
              who owns it · level · role · status · what it's done · how to use it.
              The résumé card does that; SEE IT WORK (proof) and the run panel
              follow it. */}
          {/* UNLOCK / USE FIRST (2026-06-06): owners landed below a wall of
              explainer and had to scroll to find the unlock. The dashboard (the
              activate + run surface) now leads; the résumé follows; the full
              "how it works" pitch is one click away in a collapsed block so the
              page isn't a wall. */}
          {/* THE ONE HERO — 2026-06-07 newcomer-overwhelm fix (founder: "every
              page is too complex"). The agent card is the SINGLE focal element;
              everything below it is collapsed so a newcomer who lands here from
              "See an Agent" sees one clear thing to do, not a wall of panels. */}
          <CitizenAgentDashboard citizenId={tid} />
          {/* Proof CTA — the public work-log, right after the agent block. Shown
              only when the log has real entries; otherwise it would dead-end on
              the empty "No public work yet" state. */}
          {agentWorkCount > 0 && (
            <div className="worklog-cta-row">
              <Link className="btn btn-secondary" href={`/citizens/${tid}/log`}>
                <span className="ttl">VIEW PUBLIC WORK LOG →</span>
              </Link>
            </div>
          )}
          {/* RÉSUMÉ & RECORD — collapsed. The résumé + the detailed level/skill/
              memory record are reference, not the lead; one tap away so they don't
              stack two open panels under the hero. */}
          <details className="collector-details">
            <summary className="collector-summary">Résumé &amp; record</summary>
            <CitizenResume tokenId={tid} />
            <CitizenProgressPanel tokenId={tid} />
          </details>
          {/* HOW IT WORKS — collapsed explainer for newcomers. */}
          <details className="citizen-howto">
            <summary>New here? How a FREELON agent works · what you pay →</summary>
            <CitizenAgentExplainer />
          </details>

          {/* COLLECTOR & NFT DETAILS — 2026-06-04 newcomer-path simplification
              (founder: "the try-an-agent page is too much"). Everything below the
              agent block (lore, NFT traits, rarity/value score, scarcity, owner
              tools) is folded into ONE collapsed expander so the page LEADS with
              the agent and doesn't wall a newcomer. The components are unchanged —
              only wrapped — so owner tools still work once expanded. */}
          <details className="collector-details">
            <summary className="collector-summary">Collector &amp; NFT details</summary>

          {/* Owner tools — self-hide for non-owners, so for a newcomer this is
              invisible; grouped here so they never wall the agent flow above. */}
          <EvolvePanel citizenId={tid} />
          <YourStable />

          {identity && (
            <div className="identity-block">
              <div className="headline" style={{ color }}>{identity.headline}</div>
              <p className="bio">{identity.bio}</p>
            </div>
          )}

          {c.tier === "Honorary" && (
            <QuestTracker questId="archivist" stepId={`honoree:${id4}`} />
          )}
          <CitizenDeepLore
            citizenId={tid}
            cost={unlockCost(tid)}
            deepLore={getDeepLore(c)}
            previewLine={
              identity?.bio
                ? identity.bio.split(/(?<=[.!?])\s+/)[0] || identity.bio.slice(0, 160)
                : `Citizen #${id4} of ${civ?.name}.`
            }
          />

          <div className="citizen-meta-strip">
            <div className="cm-cell">
              <span className="cm-lbl">Rarity rank</span>
              <span className="cm-val">
                {rank ? `#${rank}` : "—"} <small>/ 4040</small>
              </span>
            </div>
            <div className="cm-cell">
              <span className="cm-lbl">Days held</span>
              <span className="cm-val">
                {meta.daysHeld != null ? `${meta.daysHeld}d` : "—"}
              </span>
            </div>
            <div className="cm-cell">
              <span className="cm-lbl">Last sale</span>
              <span className="cm-val">
                {meta.lastSaleEth != null ? `${meta.lastSaleEth.toFixed(4)} ETH` : "—"}
              </span>
            </div>
          </div>

          <div style={{ marginTop: "var(--s-3)" }}>
            <WatchlistButton tokenId={tid} />
          </div>

          <dl className="trait-grid">
            {FIELDS.map((f) => (
              <div key={f.key} className="trait">
                <dt>{f.label.toUpperCase()}</dt>
                <dd>{(c as unknown as CitizenLike)[f.key]}</dd>
              </div>
            ))}
            {c.aura && c.aura !== "None" && (
              <div className="trait">
                <dt>AURA</dt><dd>{c.aura}</dd>
              </div>
            )}
          </dl>

          {/* Full record + daily flavor live DOWN here now (not stacked under the
              résumé hero) — the detailed skill bars / memory log / check-in are
              reference, not the lead. */}
          <CitizenCheckIn citizenId={tid} initial={todayCheckIn} rank={levelRank} />

          {/* Training (jobs) stays below the traits — it's the slow leveling
              loop, secondary to the agent dashboard above. */}
          <CitizenJobsBoard citizenId={tid} />

          {valueCard && (
            <section
              className="citizen-value-card"
              style={{
                marginTop: "var(--s-4)",
                padding: "var(--s-4)",
                border: `1px solid ${color}55`,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${color}10, rgba(0,0,0,0.4))`,
              }}
            >
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
                <span className="kicker" style={{ color }}>⬡ CITY STANDING · COLLECTOR RANK</span>
                {valueCard.civRank && (
                  <span
                    className="kicker"
                    style={{ color, fontWeight: 700, letterSpacing: "0.22em" }}
                    title={`Standing among all ${valueCard.civRank.outOf} ${civ?.name ?? ""} citizens`}
                  >
                    #{valueCard.civRank.rank} / {valueCard.civRank.outOf} · {civ?.name?.toUpperCase()}
                  </span>
                )}
              </header>
              {/* 2026-06-07 copy-safety: this is an in-city collector standing
                  (rarity + how active the citizen has been), NOT a price, market
                  value, or investment signal. Stated explicitly so the score
                  never reads as a return/appreciation claim next to the agent. */}
              <p style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.5, margin: "0 0 12px" }}>
                A fun in-city standing — not a price, market value, or investment signal.
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: "clamp(40px, 6vw, 64px)",
                    lineHeight: 1,
                    color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {valueCard.computed.value}
                </span>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.22em" }}>
                  / 1000 pts
                </span>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", letterSpacing: "0.14em" }}>
                  · {valueCard.stats.hex.toLocaleString()} ⬡ accumulated
                </span>
              </div>

              {/* Acceptance tier + age (2026-05-25). Tier is the lore-named
                  band so a holder reads "MONOLITH" instead of "923/1000".
                  Age starts at 404 ticks (the signal was already old) and
                  adds +1 per real day held by the current carrier. */}
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 11px",
                    border: `1px solid ${color}`,
                    background: `${color}18`,
                    color,
                    borderRadius: 999,
                    fontFamily: "var(--mono2)",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                  title={`The city accepts you at this band (${valueCard.tier.band[0]}-${valueCard.tier.band[1]} value).${
                    valueCard.tier.nextAt
                      ? ` Next tier at ${valueCard.tier.nextAt}.`
                      : ` Top tier reached.`
                  }`}
                >
                  ⬡ {valueCard.tier.tier}
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono2)",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                  title={`Every citizen starts at 404 ticks (the signal was already old). +1 tick per real day under current carrier.`}
                >
                  AGE · <strong style={{ color: "var(--ink-2)" }}>{valueCard.age.ticks.toLocaleString()}</strong> TICKS
                  {valueCard.age.carrierDays > 0 && (
                    <> · <strong style={{ color: "var(--ink-2)" }}>{valueCard.age.carrierDays}</strong>D UNDER CARRIER</>
                  )}
                </span>
                {valueCard.tier.nextAt && (
                  <span
                    style={{
                      fontFamily: "var(--mono2)",
                      fontSize: 10,
                      color: "var(--ink-dim)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    NEXT · {valueCard.tier.nextAt - valueCard.computed.value} TO ASCEND
                  </span>
                )}
              </div>

              <ul
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 8,
                  fontFamily: "var(--mono2)",
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  letterSpacing: "0.12em",
                  listStyle: "none",
                  padding: 0,
                  textTransform: "uppercase",
                }}
              >
                <li>TRADES · <strong style={{ color: "var(--ink-2)" }}>{valueCard.computed.breakdown.salePts}/400</strong></li>
                <li>RARITY · <strong style={{ color: "var(--ink-2)" }}>{valueCard.computed.breakdown.rarityPts}/300</strong></li>
                <li>HEX · <strong style={{ color: "var(--ink-2)" }}>{valueCard.computed.breakdown.hexPts}/200</strong></li>
                <li>HELD · <strong style={{ color: "var(--ink-2)" }}>{valueCard.computed.breakdown.holdPts}/100</strong></li>
              </ul>
            </section>
          )}

          <div className="scarcity">
            <span className="kicker">SCARCITY</span>
            <ul>
              <li><span>1 of</span><strong>{counts.sameCiv}</strong>{civ?.name} citizens</li>
              <li><span>1 of</span><strong>{counts.sameShape}</strong>{c.shape} shapes</li>
              <li><span>1 of</span><strong>{counts.sameCombo}</strong>with this exact civ × shape × tier</li>
            </ul>
          </div>

          <CitizenNameEditor citizenId={tid} currentName={customName?.name ?? null} />
          <CitizenRealignEditor
            citizenId={tid}
            tier={c.tier}
            originalCiv={c.civilization}
            currentRealignment={realign}
          />
          </details>

          {/* OpenSea lives once on this page now — the BUY button in NEXT SIGNAL
              below. This row is share/listing/tribute only (2026-06-07 dedup). */}
          <div className="cta-row ui-cta-row">
            <Link className="btn" href={`/citizens/${tid}/card`}>
              <span className="ttl">SHAREABLE LISTING CARD →</span>
            </Link>
            {c.honoree_handle && (
              <a
                className="btn btn-primary"
                href={tweetIntent(tweetTribute({ handle: c.honoree_handle, tokenId: tid }))}
                target="_blank" rel="noreferrer"
              >
                <span className="lbl">TRIBUTE</span>
                <span className="ttl">TWEET AT {c.honoree_handle?.toUpperCase()} <span className="ar">→</span></span>
              </a>
            )}
            {c.honoree && (
              <Link className="btn" href={`/tribute/${cleanHandle || tid}`}>
                <span className="ttl">TRIBUTE PAGE →</span>
              </Link>
            )}
            <ShareButtons citizen={c} siteUrl="https://www.freeloncity.com" />
          </div>

          <nav className="citizen-nav">
            {tid > 1 ? <Link href={`/citizens/${tid - 1}`}>← #{(tid - 1).toString().padStart(4, "0")}</Link> : <span />}
            {tid < 4040 && <Link href={`/citizens/${tid + 1}`}>#{(tid + 1).toString().padStart(4, "0")} →</Link>}
          </nav>
        </section>
      </article>

      <section style={{ marginTop: "var(--s-5)", maxWidth: "var(--maxw)", margin: "var(--s-5) auto 0", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          {/* 2026-06-07: demoted to secondary. The agent dashboard above is the
              page's single primary — for an owner it's UNLOCK, for a non-owner its
              locked hero already drives the OpenSea buy. A second gold BUY here
              made two competing primaries. */}
          <a className="btn btn-secondary" href={openseaUrl(tid)} target="_blank" rel="noreferrer"><span className="ttl">BUY ON OPENSEA ↗</span></a>
          <Link className="btn btn-secondary" href={`/civilizations/${c.civilization}`}><span className="ttl">EXPLORE {civ?.name?.toUpperCase()} →</span></Link>
          <Link className="btn btn-secondary" href="/citizens"><span className="ttl">BROWSE ALL 4040 →</span></Link>
        </div>
      </section>
    </div>
  );
}
