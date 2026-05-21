import Link from "next/link";
import { notFound } from "next/navigation";
import { CIVILIZATIONS, CivilizationSlug } from "@/lib/constants";
import { getByCivilization } from "@/lib/citizens";
import { CitizenCard } from "@/components/CitizenCard";
import { CivVisitTracker } from "@/components/CivVisitTracker";
import { QuestTracker } from "@/components/QuestTracker";

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
        </section>
      )}

      <section className="mt-16 border-t border-white/5 pt-12">
        <div className="terminal text-[var(--color-gold)] text-xs tracking-[0.3em]">FEATURED CITIZENS</div>
        <h2 className="mt-2 text-2xl font-light mb-8">Elevated members of the {c.doctrine} doctrine</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {featured.map((cit) => <CitizenCard key={cit.id} citizen={cit} size="sm" />)}
        </div>
      </section>

      <div className="mt-16 flex justify-between">
        <Link href="/civilizations" className="terminal text-[var(--color-ink-dim)] text-sm uppercase tracking-widest hover:text-[var(--color-gold)]">← all civilizations</Link>
        <span className="terminal text-[var(--color-ink-dim)] text-sm uppercase tracking-widest">{citizens.length} total citizens</span>
      </div>
    </div>
  );
}
