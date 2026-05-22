import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCitizen, countSimilar, civilizationColor, getIdentity } from "@/lib/citizens";
import { imageUrl, openseaUrl, CIVILIZATIONS } from "@/lib/constants";
import { ShareButtons } from "@/components/ShareButtons";
import { CitizenDeepLore } from "@/components/CitizenDeepLore";
import { QuestTracker } from "@/components/QuestTracker";
import { CitizenOwnedByYou } from "@/components/CitizenOwnedByYou";
import { CitizenNameEditor } from "@/components/CitizenNameEditor";
import { CitizenRealignEditor } from "@/components/CitizenRealignEditor";
import { getDeepLore, unlockCost } from "@/lib/deep-lore";
import { getName } from "@/lib/name-store";
import { getRealignment } from "@/lib/realignment-store";
import { epithetFor } from "@/lib/epithets";
import { rarityRank } from "@/lib/rarity";
import { getCitizenMeta, type CitizenMeta } from "@/lib/citizen-meta";

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

  const rank = rarityRank(tid);
  const meta = await Promise.race<CitizenMeta>([
    getCitizenMeta(tid),
    new Promise<CitizenMeta>((r) =>
      setTimeout(() => r({ daysHeld: null, lastSaleEth: null, lastSaleTs: null }), 6000)
    ),
  ]);

  return (
    <main className="citizen-page" style={{ "--civ": color } as React.CSSProperties}>
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

          <div className="cta-row">
            <a className="btn" href={openseaUrl(tid)} target="_blank" rel="noreferrer">
              <span className="ttl">VIEW ON OPENSEA ↗</span>
            </a>
            <Link className="btn" href={`/citizens/${tid}/card`}>
              <span className="ttl">SHAREABLE LISTING CARD →</span>
            </Link>
            {c.honoree_handle && (
              <a
                className="btn btn-primary"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${c.honoree_handle} — citizen #${id4} of FREELON CITY carries your name.\n\nfreeloncity.com/tribute/${cleanHandle}`)}`}
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
            <ShareButtons citizen={c} siteUrl="https://freeloncity.com" />
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
          <a className="btn btn-primary" href={openseaUrl(tid)} target="_blank" rel="noreferrer"><span className="ttl">BUY ON OPENSEA ↗</span></a>
          <Link className="btn btn-secondary" href={`/civilizations/${c.civilization}`}><span className="ttl">EXPLORE {civ?.name?.toUpperCase()} →</span></Link>
          <Link className="btn btn-secondary" href="/citizens"><span className="ttl">BROWSE ALL 4040 →</span></Link>
        </div>
      </section>
    </main>
  );
}
