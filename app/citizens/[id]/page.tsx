import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCitizen, countSimilar, civilizationColor, getIdentity } from "@/lib/citizens";
import { imageUrl, gridImageUrl, openseaUrl, CIVILIZATIONS } from "@/lib/constants";
import { ShareButtons } from "@/components/ShareButtons";
import { CitizenDeepLore } from "@/components/CitizenDeepLore";
import { QuestTracker } from "@/components/QuestTracker";
import { CitizenOwnedByYou } from "@/components/CitizenOwnedByYou";
import { CitizenNameEditor } from "@/components/CitizenNameEditor";
import { CitizenRealignEditor } from "@/components/CitizenRealignEditor";
import { CitizenProgressPanel } from "@/components/CitizenProgressPanel";
import { CitizenCheckIn } from "@/components/CitizenCheckIn";
import { CitizenResume } from "@/components/CitizenResume";
import { CitizenAgentExplainer } from "@/components/CitizenAgentExplainer";
import { ActivationProof } from "@/components/ActivationProof";
import { CitizenLifeHero } from "@/components/CitizenLifeHero";
import { CitizenWorkspaceCta } from "@/components/CitizenWorkspaceCta";
import { EvolvePanel } from "@/components/EvolvePanel";
import YourStable from "@/components/YourStable";
import { getCheckIn } from "@/lib/daily-checkin";
import { getArtifacts } from "@/lib/city-week";
import { DispatchPanel } from "@/components/DispatchPanel";
import { getRankByLevel, getProgress } from "@/lib/progression-store";
import { getDeepLore, unlockCost } from "@/lib/deep-lore";
import { getName } from "@/lib/name-store";
import { getRealignment } from "@/lib/realignment-store";
import { epithetFor } from "@/lib/epithets";
import { rarityRank } from "@/lib/rarity";
import { getCitizenMeta, type CitizenMeta } from "@/lib/citizen-meta";
import { tweetTribute, tweetIntent } from "@/lib/share";
import { getAgentHistory } from "@/lib/agent-history";
import { unlockStatus } from "@/lib/missions/unlock-store";
import { TransmissionLoop } from "@/components/TransmissionLoop";
import { HonoraryDisclaimer } from "@/components/HonoraryDisclaimer";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { LastSignal } from "@/components/LastSignal";
import beats from "@/components/DossierBeats.module.css";
import presence from "@/components/Presence.module.css";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return { title: "Not found" };
  // ?v=2 busts the 1-year immutable CDN cache so social scrapers refetch the
  // redesigned card (civ-colored, thesis footer) instead of the old flat one.
  const ogUrl = `/api/og/${tid}?v=2`;
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

// Tokens with a cinematic battle-record still in /public/transmission-stills/
// (2026-06-11, generated from each citizen's REAL render via OpenRouter after
// the commissioned cutscene videos were cut for quality). The four 1/1s
// (origin / patient-zero / genesis / final-signal) + honoraries (vitalik 21,
// beeple 123, elon 333, hobbs 555, zagabond 777, waleswoosh 3690).
const CUTSCENE_TOKENS = new Set([1, 21, 123, 333, 404, 555, 777, 1337, 3690, 4040]);

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

/**
 * CITIZEN PROFILE — the public, shareable IDENTITY page.
 *
 * 2026-06-11 (Book city chapter): restructured into a premium-PDP 3-beat read
 * — BEAT 1 identity (art, name, civ, epithet, scarcity) → BEAT 2 the public
 * record (cutscene, latest work artifact w/ relic chrome, work-log link, life
 * cells, artifacts) → BEAT 3 ONE primary CTA (open the workspace). Everything
 * else is folded, not deleted: OWNER TOOLS / DEEP RECORDS <details> shelves +
 * the existing "new here" explainer fold. Beats stage in via RevealOnScroll
 * (70ms stagger, 600ms quint, once, reduced-motion-gated).
 *
 * Removed in the 2026-06-07 gut: the 0-1000 "value score" card (read as an
 * appreciation proxy next to real ETH sale data — copy-safety risk) and the
 * SIGNAL-LOST / DUMPED ghost state (degen floor-trading vocabulary, off the
 * premium-collector brand). Both are gone, not hidden.
 */
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
  // Earned week-stamped artifacts (the renewable collectible record) — public,
  // status-only, travels with the token.
  const artifacts = await getArtifacts(tid).catch(() => []);
  const realign = await getRealignment(tid).catch(() => null);
  const alignedCivDef = realign
    ? (CIVILIZATIONS as Record<string, { name: string }>)[realign.alignedCiv]
    : null;
  const cleanHandle = (c.honoree_handle || "").replace(/^@/, "");

  // Daily check-in (today's line if already generated) + level rank + whether
  // the public work-log has entries — all cheap, all fail-quiet so they never
  // block the profile render.
  const [todayCheckIn, levelRank, agentWork, activation, progress] = await Promise.all([
    getCheckIn(tid).catch(() => null),
    getRankByLevel(tid).catch(() => null),
    getAgentHistory(tid).catch(() => []),
    unlockStatus(tid).catch(() => null),
    getProgress(tid).catch(() => null),
  ]);
  const agentWorkCount = agentWork.length;
  // LATEST WORK (2026-06-10): the most recent image artifact, shown as public
  // proof on the dossier. Image URLs are PUBLIC per
  // docs/HISTORY_VISIBILITY_POLICY.md (text body/brief stay owner-only) —
  // a real render is what turns "visible work history" from a claim into
  // something a buyer can see. History is newest-first (agent-history unshift).
  const latestWorkImage = agentWork.find((w) => w.kind === "image" && !!w.body) ?? null;
  // LAST SIGNAL (2026-06-11, kit: .living-city/ai-presence.md): the most recent
  // REAL work timestamp — honest presence, derived from the same agentWork load.
  // History is newest-first, but max() keeps it correct regardless of order.
  // Null when the token has no work yet; <LastSignal> self-hides on null.
  const lastSignalTs = agentWork.reduce<number | null>(
    (max, w) => (typeof w.timestamp === "number" && w.timestamp > 0 && (max === null || w.timestamp > max) ? w.timestamp : max),
    null
  );
  // PUBLIC LIFE (2026-06-10): the playable-identity moat made visible. Counts
  // only (level / work-log size / artifacts) — public proof per
  // docs/HISTORY_VISIBILITY_POLICY.md; raw work bodies stay owner-only. The
  // life cells render ONLY once the token has any record (empty-stadium rule).
  const hasLife = (progress?.level ?? 1) > 1 || agentWorkCount > 0 || artifacts.length > 0;
  // An ACTIVATED citizen (paid ETH unlock) gets a visible "awakened" glow on its
  // portrait — a reward for the owner + a sell ("the lit ones are alive").
  const isActivated = activation?.unlocked === true;

  // RECOVERED TRANSMISSION (2026-06-11): a cinematic battle-record still for
  // the four 1/1s + six honoraries, generated from the citizen's real render.
  const hasCutscene = CUTSCENE_TOKENS.has(tid);

  const rank = rarityRank(tid);
  const meta = await Promise.race<CitizenMeta>([
    getCitizenMeta(tid),
    new Promise<CitizenMeta>((r) =>
      setTimeout(() => r({ daysHeld: null, lastSaleEth: null, lastSaleTs: null }), 6000)
    ),
  ]);

  // SEO #30 (2026-06-27) — per-page structured data. Citizen profiles are the
  // 4,040 deepest pages on the site and carried ZERO JSON-LD, so Google saw them
  // as generic pages. A CreativeWork describes the citizen as an artwork (name,
  // image, collection it's part of), and a BreadcrumbList gives the
  // Home › Citizens › #NNNN trail for SERP breadcrumb rendering. Plain serialized
  // facts already on the page — no new claims.
  const BASE = "https://www.freeloncity.com";
  const displayName = customName?.name || c.transmission_name || c.name;
  const citizenUrl = `${BASE}/citizens/${tid}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: displayName,
      url: citizenUrl,
      image: imageUrl(tid),
      description: `${c.shape} · ${c.civilization.replace("-", " ")} · ${c.caste} · ${c.tier}`,
      identifier: id4,
      isPartOf: { "@type": "Collection", name: "FREELON CITY", url: `${BASE}/citizens` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "FREELON CITY", item: BASE },
        { "@type": "ListItem", position: 2, name: "Citizens", item: `${BASE}/citizens` },
        { "@type": "ListItem", position: 3, name: `#${id4}`, item: citizenUrl },
      ],
    },
  ];

  return (
    <div className="citizen-page" style={{ "--civ": color } as React.CSSProperties}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="citizen-grid">
        <aside className="citizen-image">
          {/* Art rises first (slot 0); the sticky positioning stays on the
              aside itself so the wrapper never breaks it. */}
          <RevealOnScroll index={0}>
            {/* PRESENCE (2026-06-11, kit: .living-city/ai-presence.md) — DORMANT
                breath + civ aura (.tinted reads --civ). On activated shells the
                stronger gold awaken-breathe keeps winning (higher specificity). */}
            {/* LIVING HERO (2026-06-26) — the art awakens on load (dead→alive)
                and, left alone, the light goes out of its eye until you touch
                it. The shell still owns the civ-halo frame + AWAKENED glyph;
                the breath now comes from the portrait itself, so presence.breath
                is dropped to avoid a double-breath beat. */}
            <div className={`img-shell relic-card${isActivated ? " is-activated" : ""} ${presence.aura} ${presence.tinted}`}>
              <CitizenLifeHero
                tokenId={tid}
                src={gridImageUrl(tid, 640)}
                name={customName?.name || c.transmission_name || c.name}
                fill
                frame={false}
              />
              {isActivated && <span className="activated-glyph" aria-label="Activated agent">⬡ AWAKENED</span>}
            </div>
            <div className="img-meta">
              <span className="big-id">#{id4}</span>
              <span className="big-tier" style={{ color }}>{c.tier}</span>
            </div>
          </RevealOnScroll>
        </aside>

        <section className="citizen-body">
          {/* ══ BEAT 1 · IDENTITY — who this is + why it's collectible
                 (art, name, civ, epithet, scarcity). ══ */}
          <RevealOnScroll index={1}>
            <span className="stamp">⬡ FREELON CITY · CITIZEN #{id4}</span>
            {/* Shape — the IP — promoted above the name/civilization beat (audit #30). */}
            {c.shape && <div className="kicker" style={{ color, marginTop: 6, letterSpacing: "0.2em" }}>{c.shape.toUpperCase()}</div>}
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
                <div>
                  <HonoraryDisclaimer name={c.honoree} />
                </div>
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

            {/* IDENTITY — the lore that makes this a character, kept short. */}
            {identity && (
              <div className="identity-block">
                <div className="headline" style={{ color }}>{identity.headline}</div>
                <p className="bio">{identity.bio}</p>
              </div>
            )}

            {/* SCARCITY — why this one is collectible. Identity, not a price. Each
                line carries a rarity meter (rarer = shorter, emptier bar) so "1 of 6"
                READS rarer than "1 of 412" instead of looking identical. The exact
                civ×shape×tier combo is flagged RAREST when its population is tiny. */}
            <div className="scarcity">
              <span className="kicker">SCARCITY</span>
              <ul>
                {[
                  { n: counts.sameCiv, label: `${civ?.name} citizens`, rare: false },
                  { n: counts.sameShape, label: `${c.shape} shapes`, rare: false },
                  { n: counts.sameCombo, label: "with this exact civ × shape × tier", rare: counts.sameCombo <= 25 },
                ].map((row, i) => (
                  <li
                    key={i}
                    data-rare={row.rare ? "true" : undefined}
                    style={{ "--pct": Math.min(1, Math.max(0.012, row.n / 4040)) } as React.CSSProperties}
                  >
                    <div className="scar-row">
                      <span>1 of</span>
                      <strong>{row.n}</strong>
                      <span className="scar-label">{row.label}</span>
                      {row.rare && <span className="scar-rarest">RAREST</span>}
                    </div>
                    <span className="scar-bar" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </div>
          </RevealOnScroll>

          {/* ══ BEAT 2 · THE PUBLIC RECORD — what this token has DONE: the
                 work artifact (relic chrome), the work log, the life cells,
                 the week-stamped artifacts. ══ */}
          <RevealOnScroll index={2}>
            {/* RECOVERED TRANSMISSION — an ambient battle-record loop for the
                1/1s + honoraries: Grok img2vid animated FROM the citizen's
                transmission still (itself generated from the real render), so
                the character is faithful; the still is the poster/fallback. */}
            {hasCutscene && (
              <section className="transmission-cut">
                <span className="kicker" style={{ color: "var(--gold)" }}>⬡ RECOVERED TRANSMISSION · COMBAT RECORD</span>
                <TransmissionLoop
                  src={`/transmission-stills/${tid}.mp4`}
                  poster={`/transmission-stills/${tid}.jpg`}
                  alt={`Combat record — citizen #${id4}`}
                />
              </section>
            )}

            {/* LATEST WORK — the newest image artifact as visible public proof,
                presented as a "moment": relic chrome (gold top hairline, layered
                shadow, hover lift — DossierBeats.module.css). Self-hides when
                the citizen has produced no image work yet. */}
            {latestWorkImage && (
              <section className="panel-premium" style={{ padding: "var(--s-4)", margin: "var(--s-3) 0 0" }}>
                <span className="kicker" style={{ color: "var(--gold)" }}>⬡ LATEST WORK · PUBLIC RECORD</span>
                <Link href={`/citizens/${tid}/log`} className={beats.latestWork}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={latestWorkImage.body}
                    alt={`${latestWorkImage.abilityLabel || latestWorkImage.ability} — ${latestWorkImage.task}`}
                    loading="lazy"
                  />
                </Link>
                <div className={beats.workCaption}>
                  {latestWorkImage.abilityLabel || latestWorkImage.ability} · {latestWorkImage.task}
                </div>
              </section>
            )}
            {agentWorkCount > 0 && (
              <div className="worklog-cta-row">
                <Link className="btn btn-secondary" href={`/citizens/${tid}/log`}>
                  <span className="ttl">VIEW PUBLIC WORK LOG →</span>
                </Link>
              </div>
            )}

            {/* LAST SIGNAL — when this token last actually produced work. Renders
                only from a real timestamp (never fakes); dot stays static here
                because nothing is live on a static dossier. */}
            {lastSignalTs !== null && (
              <div style={{ margin: "var(--s-3) 0 0" }}>
                <LastSignal timestamp={lastSignalTs} />
              </div>
            )}

            {/* COLLECTOR FACTS + CITY RECORD — rarity/provenance, then the token's
                LIFE (level, public work log, artifacts). Factual data only; the
                life cells self-hide until a record exists. */}
            <div className="citizen-meta-strip">
              <div className="cm-cell">
                <span className="cm-lbl">Rarity rank</span>
                <span className="cm-val">{rank ? `#${rank}` : "—"} <small>/ 4040</small></span>
              </div>
              <div className="cm-cell">
                <span className="cm-lbl">Days held</span>
                <span className="cm-val">{meta.daysHeld != null ? `${meta.daysHeld}d` : "—"}</span>
              </div>
              <div className="cm-cell">
                <span className="cm-lbl">Last sale</span>
                <span className="cm-val">{meta.lastSaleEth != null ? `${meta.lastSaleEth.toFixed(4)} ETH` : "—"}</span>
              </div>
              {hasLife && (
                <>
                  <div className="cm-cell">
                    <span className="cm-lbl">Level</span>
                    <span className="cm-val">LV {progress?.level ?? 1}{levelRank ? <small> · city #{levelRank}</small> : null}</span>
                  </div>
                  <div className="cm-cell">
                    <span className="cm-lbl">Work log</span>
                    <span className="cm-val">{agentWorkCount}</span>
                  </div>
                  <div className="cm-cell">
                    <span className="cm-lbl">Artifacts</span>
                    <span className="cm-val">{artifacts.length}</span>
                  </div>
                </>
              )}
            </div>

            {/* ARTIFACTS — public, status-only, travels with the token. Part of
                the public record a buyer should see. Self-hides at zero. */}
            {artifacts.length > 0 && (
              <section className="panel-premium" style={{ padding: "var(--s-4)", marginTop: "var(--s-3)" }}>
                <span className="kicker" style={{ color: "var(--gold)" }}>⬡ ARTIFACTS · {artifacts.length}</span>
                <p style={{ fontFamily: "var(--mono2)", fontSize: 11.5, color: "var(--ink-dim)", margin: "4px 0 12px" }}>
                  Week-stamped marks earned in the city. They travel with the NFT.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {artifacts.map((a) => (
                    <span
                      key={a.id}
                      title={a.title}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px",
                        borderRadius: 999, border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
                        background: "color-mix(in srgb, var(--gold) 8%, transparent)",
                        fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink)", letterSpacing: "0.04em",
                      }}
                    >
                      <span style={{ color: "var(--gold)" }}>⬡</span>{a.title}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </RevealOnScroll>

          {/* ══ BEAT 3 · THE ONE CTA — open the agent workspace. The profile is
                 the public, shareable identity page; this single action opens
                 the full workspace (chat, image, history, owner tools) "like
                 opening ChatGPT or Claude". ══ */}
          <RevealOnScroll index={3}>
            <CitizenWorkspaceCta tid={tid} color={color} />
            {/* Social proof — real strangers have already unlocked. Self-hides at 0. */}
            <div style={{ margin: "var(--s-3) 0" }}>
              <ActivationProof compact />
            </div>
            {/* Surface the shareable listing card above the fold (was buried in the
                DEEP RECORDS fold) — the best shareable artefact on the page. (upgrade plan: virality) */}
            <div style={{ margin: "var(--s-2) 0 0", textAlign: "center" }}>
              <Link href={`/citizens/${tid}/card`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex" }}>
                <span className="ttl">SHARE THIS CITIZEN →</span>
              </Link>
            </div>
          </RevealOnScroll>

          {/* ══ FOLDS — everything else, folded not deleted (2026-06-11 Book
                 3-beat PDP): owner tools + dispatch in one shelf, traits /
                 lore / share in a second, the newcomer explainer keeps its
                 own fold. Each owner component self-hides for non-owners. ══ */}
          <RevealOnScroll index={4}>
            <details className="collector-details">
              <summary className="collector-summary">⬡ OWNER TOOLS</summary>
              {/* CITY DISPATCH — the "give it a job" board. Self-gates: owners
                  get the send control, everyone else only ever sees the public
                  dispatch log; renders nothing for a token with no history. */}
              <DispatchPanel citizenId={tid} name={customName?.name || c.transmission_name || c.name || `Citizen #${id4}`} />
              <CitizenCheckIn citizenId={tid} initial={todayCheckIn} rank={levelRank} />
              <EvolvePanel citizenId={tid} />
              <CitizenResume tokenId={tid} />
              <CitizenProgressPanel tokenId={tid} />
              <CitizenNameEditor citizenId={tid} currentName={customName?.name ?? null} />
              <CitizenRealignEditor
                citizenId={tid}
                tier={c.tier}
                originalCiv={c.civilization}
                currentRealignment={realign}
              />
              <YourStable />
            </details>

            <details className="collector-details">
              <summary className="collector-summary">⬡ DEEP RECORDS</summary>
              <dl className="trait-grid">
                {FIELDS.map((f) => (
                  <div key={f.key} className="trait">
                    <dt>{f.label.toUpperCase()}</dt>
                    <dd>{(c as unknown as CitizenLike)[f.key]}</dd>
                  </div>
                ))}
                {c.aura && c.aura !== "None" && (
                  <div className="trait"><dt>AURA</dt><dd>{c.aura}</dd></div>
                )}
              </dl>

              {/* LORE — deep lore is a paid unlock. */}
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

              {/* Share / listing / tribute. Buying lives once below in NEXT SIGNAL. */}
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
            </details>

            {/* NEW HERE — how a FREELON agent works + what you pay, collapsed. */}
            <details className="citizen-howto">
              <summary>New here? How a FREELON agent works · what you pay →</summary>
              <CitizenAgentExplainer tokenId={tid} />
            </details>
          </RevealOnScroll>

          <nav className="citizen-nav">
            {tid > 1 ? <Link href={`/citizens/${tid - 1}`}>← #{(tid - 1).toString().padStart(4, "0")}</Link> : <span />}
            {tid < 4040 && <Link href={`/citizens/${tid + 1}`}>#{(tid + 1).toString().padStart(4, "0")} →</Link>}
          </nav>
        </section>
      </article>

      <section style={{ marginTop: "var(--s-5)", maxWidth: "var(--maxw)", margin: "var(--s-5) auto 0", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <a className="btn btn-secondary" href={openseaUrl(tid)} target="_blank" rel="noreferrer"><span className="ttl">VIEW ON OPENSEA ↗</span></a>
          <Link className="btn btn-secondary" href={`/civilizations/${c.civilization}`}><span className="ttl">EXPLORE {civ?.name?.toUpperCase()} →</span></Link>
          <Link className="btn btn-secondary" href="/citizens"><span className="ttl">BROWSE ALL 4040 →</span></Link>
        </div>
        {/* 2026-06-08 (Discord, KinkiDred): a holder found his PFP #887, hit
            "BUY", and couldn't — it wasn't listed, so OpenSea only offered
            "Make offer". The old "BUY ON OPENSEA" label promised a buy button
            that doesn't exist for unlisted tokens. Set the expectation here. */}
        <p style={{ marginTop: "var(--s-3)", fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6, maxWidth: 560 }}>
          If this one isn&apos;t listed for sale, OpenSea will show <strong style={{ color: "var(--ink-2)" }}>Make offer</strong> instead of a buy button — you can still bid for it there.
        </p>
      </section>
    </div>
  );
}
