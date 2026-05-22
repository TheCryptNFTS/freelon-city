import Link from "next/link";
import { notFound } from "next/navigation";
import { CIVILIZATIONS, CivilizationSlug } from "@/lib/constants";
import { getByCivilization } from "@/lib/citizens";
import { CitizenCard } from "@/components/CitizenCard";
import { CivVisitTracker } from "@/components/CivVisitTracker";
import { QuestTracker } from "@/components/QuestTracker";
import { DoctrineFragment } from "@/components/DoctrineFragment";
import { PropagandaShareButtons } from "@/components/PropagandaShareButtons";
import { ShareOG } from "@/components/ShareOG";
import { MayorBroadcast } from "@/components/MayorBroadcast";
import { getBroadcast } from "@/lib/civ-broadcast-store";
import doctrineFragments from "@/data/doctrine-fragments.json";

export function generateStaticParams() {
  return Object.keys(CIVILIZATIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = (CIVILIZATIONS as Record<string, { name: string; doctrine: string }>)[slug];
  if (!c) return { title: "Not found" };
  return { title: `${c.name} · ${c.doctrine}` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = (CIVILIZATIONS as Record<string, { name: string; doctrine: string; role: string; essence: string; population: number; color: string; rival?: string; rivalLine?: string }>)[slug];
  if (!c) notFound();
  // Mayor of this civ — sampled from on-chain holdings, 30min cache
  const { getMayor } = await import("@/lib/civ-mayor");
  const mayor = await getMayor(slug).catch(() => null);
  const broadcast = await getBroadcast(slug).catch(() => null);
  const rivalSlug = c.rival;
  const rival = rivalSlug
    ? (CIVILIZATIONS as Record<string, { name: string; doctrine: string; color: string }>)[rivalSlug]
    : null;
  const citizens = getByCivilization(slug as CivilizationSlug);
  const featured = [
    ...citizens.filter((x) => x.tier === "One of One"),
    ...citizens.filter((x) => x.tier === "Honorary"),
    ...citizens.filter((x) => x.tier === "Legendary").slice(0, 8),
    ...citizens.filter((x) => x.tier === "Epic").slice(0, 12),
  ].slice(0, 24);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <CivVisitTracker slug={slug} />
      <QuestTracker questId="city-tourist" stepId={slug} />
      <div className="terminal text-xs tracking-[0.3em]" style={{ color: c.color }}>{c.name.toUpperCase()}</div>
      <h1 className="mt-2 text-6xl font-light" style={{ color: c.color }}>{c.doctrine}</h1>
      {mayor && (
        <a className="civ-mayor" href={`/wallet/${mayor.address}`} style={{ borderColor: c.color }}>
          <span className="cm-kicker" style={{ color: c.color }}>⬡ MAYOR OF {c.name.toUpperCase()}</span>
          <span className="cm-addr">{mayor.address.slice(0, 6)}…{mayor.address.slice(-4)}</span>
          <span className="cm-count">{mayor.count}+ citizens (sampled)</span>
        </a>
      )}
      <MayorBroadcast
        slug={slug}
        color={c.color}
        initialBroadcast={broadcast}
        mayorAddress={mayor?.address ?? null}
      />
      <div className="mt-6 max-w-2xl text-[var(--color-ink-dim)] text-lg leading-relaxed">
        <p>{c.role}</p>
        <p className="mt-3 italic">{c.essence}</p>
      </div>

      <div className="mt-10 flex gap-8 items-baseline">
        <div>
          <div className="text-4xl font-light" style={{ color: c.color }}>{c.population}</div>
          <div className="text-xs uppercase tracking-widest text-[var(--color-ink-dim)]">citizens</div>
        </div>
      </div>

      {rival && rivalSlug && c.rivalLine && (
        <section className="civ-rivalry-block">
          <div className="rivalry-head">
            <span className="kicker">RIVAL DOCTRINE</span>
            <div className="rivalry-pair">
              <span className="self" style={{ color: c.color }}>{c.name.toUpperCase()}</span>
              <span className="vs">⬡</span>
              <span className="other" style={{ color: rival.color }}>{rival.name.toUpperCase()}</span>
            </div>
          </div>
          <blockquote className="rivalry-line" style={{ borderLeftColor: c.color }}>
            {c.rivalLine}
          </blockquote>
          <Link href={`/civilizations/${rivalSlug}`} className="rivalry-cta" style={{ borderColor: rival.color, color: rival.color }}>
            VIEW RIVAL · {rival.doctrine.toUpperCase()} →
          </Link>
          <PropagandaShareButtons slug={slug} />
        </section>
      )}

      <section style={{ marginTop: "var(--s-5)" }}>
        <ShareOG
          text={`I am ${c.name}. ${c.doctrine}.`}
          ogPath={`/api/og/civ-pride/${slug}`}
          pagePath={`/civilizations/${slug}`}
          variant="secondary"
          label="SHARE CIV PRIDE ↗"
        />
      </section>

      <section className="mt-16 border-t border-white/5 pt-12">
        <div className="terminal text-[var(--color-gold)] text-xs tracking-[0.3em]">FEATURED CITIZENS</div>
        <h2 className="mt-2 text-2xl font-light mb-8">Elevated members of the {c.doctrine} doctrine</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {featured.map((cit) => <CitizenCard key={cit.id} citizen={cit} size="sm" />)}
        </div>
      </section>

      {(() => {
        // Map doctrine name to fragment-json key. "Void/404" -> "void".
        const key = c.doctrine.toLowerCase().replace(/\/.*$/, "").trim();
        const fragments = doctrineFragments as Record<
          string,
          { fragment: string; stepId: string } | undefined
        >;
        const frag = fragments[key];
        if (!frag) return null;
        return <DoctrineFragment stepId={frag.stepId} fragment={frag.fragment} />;
      })()}

      <div className="mt-16 flex justify-between">
        <Link href="/civilizations" className="terminal text-[var(--color-ink-dim)] text-sm uppercase tracking-widest hover:text-[var(--color-gold)]">← all civilizations</Link>
        <span className="terminal text-[var(--color-ink-dim)] text-sm uppercase tracking-widest">{citizens.length} total citizens</span>
      </div>

      <section style={{ marginTop: "var(--s-6)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href={`/citizens?civ=${slug}`} style={{ borderColor: c.color, background: c.color, color: "var(--bg)" }}><span className="ttl">EXPLORE {c.name.toUpperCase()} CITIZENS →</span></Link>
          <Link className="btn btn-secondary" href="/sync"><span className="ttl">SYNC YOUR HANDLE →</span></Link>
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">HOW TO EARN →</span></Link>
        </div>
      </section>
    </div>
  );
}
