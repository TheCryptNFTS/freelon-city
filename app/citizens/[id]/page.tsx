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
import { CitizenCheckIn } from "@/components/CitizenCheckIn";
import { CitizenResume } from "@/components/CitizenResume";
import { CitizenAgentExplainer } from "@/components/CitizenAgentExplainer";
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

/**
 * CITIZEN PROFILE — the public, shareable IDENTITY page.
 *
 * 2026-06-07 gut (audit): this page is the buy + share surface, so it leads
 * with identity (art, name, civ, lore, scarcity) and a SINGLE focal action —
 * open the agent workspace. Every owner tool (evolve, jobs, name, realign,
 * check-in, résumé, record) is consolidated into one collapsed, self-hiding
 * shelf so a newcomer sees a one-screen identity page, not an instrument panel.
 *
 * Removed in the gut: the 0-1000 "value score" card (read as an appreciation
 * proxy next to real ETH sale data — copy-safety risk) and the SIGNAL-LOST /
 * DUMPED ghost state (degen floor-trading vocabulary, off the premium-collector
 * brand). Both are gone, not hidden.
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
  const realign = await getRealignment(tid).catch(() => null);
  const alignedCivDef = realign
    ? (CIVILIZATIONS as Record<string, { name: string }>)[realign.alignedCiv]
    : null;
  const cleanHandle = (c.honoree_handle || "").replace(/^@/, "");

  // Daily check-in (today's line if already generated) + level rank + whether
  // the public work-log has entries — all cheap, all fail-quiet so they never
  // block the profile render.
  const [todayCheckIn, levelRank, agentWorkCount] = await Promise.all([
    getCheckIn(tid).catch(() => null),
    getRankByLevel(tid).catch(() => null),
    getAgentHistory(tid).then((h) => h.length).catch(() => 0),
  ]);

  const rank = rarityRank(tid);
  const meta = await Promise.race<CitizenMeta>([
    getCitizenMeta(tid),
    new Promise<CitizenMeta>((r) =>
      setTimeout(() => r({ daysHeld: null, lastSaleEth: null, lastSaleTs: null }), 6000)
    ),
  ]);

  return (
    <div className="citizen-page" style={{ "--civ": color } as React.CSSProperties}>
      <article className="citizen-grid">
        <aside className="citizen-image">
          <div className="img-shell relic-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(tid)} alt={c.name} />
          </div>
          <div className="img-meta">
            <span className="big-id">#{id4}</span>
            <span className="big-tier" style={{ color }}>{c.tier}</span>
          </div>
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

          {/* IDENTITY — the lore that makes this a character, kept short. */}
          {identity && (
            <div className="identity-block">
              <div className="headline" style={{ color }}>{identity.headline}</div>
              <p className="bio">{identity.bio}</p>
            </div>
          )}

          {/* THE ONE HERO — open the agent workspace. The profile is the public,
              shareable identity page; this single action opens the full
              workspace (chat, image, history, owner tools) "like opening
              ChatGPT or Claude". */}
          <Link href={`/agent/${tid}`} className="workspace-open-cta" style={{ ["--accent" as string]: color }}>
            <span className="wo-kicker">YOUR AGENT WORKSPACE</span>
            <span className="wo-title">Open the workspace →</span>
            <span className="wo-sub">Chat, generate, and build a permanent work history — all in one place, like opening ChatGPT or Claude.</span>
          </Link>
          {/* Social proof — real strangers have already unlocked. Self-hides at 0. */}
          <div style={{ margin: "var(--s-3) 0" }}>
            <ActivationProof compact />
          </div>
          {agentWorkCount > 0 && (
            <div className="worklog-cta-row">
              <Link className="btn btn-secondary" href={`/citizens/${tid}/log`}>
                <span className="ttl">VIEW PUBLIC WORK LOG →</span>
              </Link>
            </div>
          )}

          {/* SCARCITY — why this one is collectible. Identity, not a price. */}
          <div className="scarcity">
            <span className="kicker">SCARCITY</span>
            <ul>
              <li><span>1 of</span><strong>{counts.sameCiv}</strong>{civ?.name} citizens</li>
              <li><span>1 of</span><strong>{counts.sameShape}</strong>{c.shape} shapes</li>
              <li><span>1 of</span><strong>{counts.sameCombo}</strong>with this exact civ × shape × tier</li>
            </ul>
          </div>

          {/* COLLECTOR FACTS — rarity rank + provenance. Factual marketplace
              data only; no computed "value" score. */}
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
          </div>

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

          {/* LORE — collapsed; deep lore is a paid unlock. */}
          <details className="collector-details">
            <summary className="collector-summary">Lore &amp; deep signal</summary>
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
          </details>

          {/* OWNER TOOLS — every interactive owner control in one place. Each
              component self-hides for non-owners, so a newcomer sees nothing
              here; collapsed so it never walls the identity above. These also
              live in the workspace — this is the at-a-glance owner shelf. */}
          <details className="collector-details">
            <summary className="collector-summary">Owner tools</summary>
            <CitizenCheckIn citizenId={tid} initial={todayCheckIn} rank={levelRank} />
            <EvolvePanel citizenId={tid} />
            <CitizenJobsBoard citizenId={tid} />
            <CitizenResume tokenId={tid} />
            <CitizenProgressPanel tokenId={tid} />
            <CitizenNameEditor citizenId={tid} currentName={customName?.name ?? null} />
            <CitizenRealignEditor
              citizenId={tid}
              tier={c.tier}
              originalCiv={c.civilization}
              currentRealignment={realign}
            />
            <WatchlistButton tokenId={tid} />
            <YourStable />
          </details>

          {/* NEW HERE — how a FREELON agent works + what you pay, collapsed. */}
          <details className="citizen-howto">
            <summary>New here? How a FREELON agent works · what you pay →</summary>
            <CitizenAgentExplainer />
          </details>

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
