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
import { CivGlyph } from "@/components/CivGlyph";
import doctrineFragments from "@/data/doctrine-fragments.json";
import { godForCiv, godOpenSeaUrl } from "@/lib/gods";

// Civs with a cinematic district establishing shot (public/districts/<slug>.jpg).
// These read as a *place* — territory in the city — which sells the lore far
// better than a portrait. The two without one fall back to the generated
// hooded-figure banner.
const DISTRICTS = new Set([
  "black-fracture", "blue-synthesis", "gold-sovereignty", "pink-luxury",
  "purple-oracle", "silver-machine", "void-404", "white-transmission",
]);

export function generateStaticParams() {
  return Object.keys(CIVILIZATIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = (CIVILIZATIONS as Record<string, { name: string; doctrine: string }>)[slug];
  if (!c) return { title: "Not found" };
  // The per-civ OG card already exists at /api/og/civ-pride/[slug]; wire it
  // into the page metadata so a shared civ link unfurls with that image
  // instead of the imageless title-only card it had before.
  const og = `/api/og/civ-pride/${slug}`;
  const title = `${c.name} · ${c.doctrine}`;
  return {
    title,
    openGraph: { title, description: c.doctrine, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: c.doctrine, images: [og] },
  };
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
  const hasDistrict = DISTRICTS.has(slug);
  // WebP banners (2026-06-16): the source PNGs were ~2.2MB each on a raw <img>
  // (no next/image on this full-bleed shot) → re-encoded to ~70KB WebP, a 97% cut.
  const bannerSrc = hasDistrict ? `/districts/${slug}.jpg` : `/generated/civ-banner-${slug}.webp`;
  const citizens = getByCivilization(slug as CivilizationSlug);
  const featured = [
    ...citizens.filter((x) => x.tier === "One of One"),
    ...citizens.filter((x) => x.tier === "Honorary"),
    ...citizens.filter((x) => x.tier === "Legendary").slice(0, 8),
    ...citizens.filter((x) => x.tier === "Epic").slice(0, 12),
  ].slice(0, 24);
  // Activated agents get the "awakened" glow — one cheap fail-quiet set fetch
  // for the whole grid (not per-card).
  const { listActivatedTokenIds } = await import("@/lib/missions/unlock-store");
  const activatedIds = await listActivatedTokenIds().catch(() => new Set<number>());

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <CivVisitTracker slug={slug} />
      <QuestTracker questId="city-tourist" stepId={slug} />
      {/* Civilization banner — a wide cinematic district establishing shot
          (the civ's territory in the city) where one exists, else the
          generated hooded-figure portrait. Bleeds full width above the
          headline. */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1536 / 640",
          maxHeight: 360,
          overflow: "hidden",
          borderRadius: 12,
          border: `1px solid ${c.color}33`,
          marginBottom: 28,
          background: "#000",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerSrc}
          alt={hasDistrict ? `${c.name} district` : `${c.name} — civilization banner`}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", objectPosition: hasDistrict ? "center 45%" : "center 35%" }}
        />
        {/* Bottom gradient for legibility of any caption later */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)",
          }}
        />
      </div>
      <div className="terminal text-xs tracking-[0.3em]" style={{ color: c.color, display: "inline-flex", alignItems: "center", gap: 10 }}>
        <CivGlyph slug={slug} color={c.color} size={20} title={c.name} />
        {c.name.toUpperCase()}
      </div>
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

      {/* PATRON GOD — the 10×10 connection between civilizations and
          the Crypt Trading Cards gods. Mapping decided 2026-05-25 by
          matching each god's mythic domain to the civ doctrine. The
          god's NFT is a 1/1 in collection 0x48fd…7394 on Ethereum. */}
      {(() => {
        const god = godForCiv(slug);
        if (!god) return null;
        return (
          <section
            style={{
              marginTop: "var(--s-5)",
              padding: "var(--s-4)",
              border: `1px solid ${c.color}55`,
              background: `linear-gradient(135deg, ${c.color}12, rgba(0,0,0,0.4))`,
              borderRadius: 14,
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <span className="kicker" style={{ color: c.color }}>
                ⬡ PATRON GOD · COMBAT ARCHIVES
              </span>
              <span
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "var(--ink-dim)",
                  textTransform: "uppercase",
                }}
              >
                ● {god.status} · TOKEN #{god.tokenId}
              </span>
            </header>
            <div
              style={{
                fontFamily: "var(--display)",
                fontSize: "clamp(34px, 5vw, 56px)",
                lineHeight: 1,
                color: c.color,
                letterSpacing: "-0.01em",
                margin: "6px 0 12px",
              }}
            >
              {god.name.toUpperCase()}
            </div>
            <p
              style={{
                fontFamily: "var(--mono2)",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.7,
                margin: "0 0 6px",
                maxWidth: 640,
              }}
            >
              {god.line}
            </p>
            <p
              style={{
                fontFamily: "var(--mono2)",
                fontSize: 11,
                color: "var(--ink-dim)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                margin: "0 0 14px",
              }}
            >
              DOMAIN · {god.domain}
            </p>
            <a
              href={godOpenSeaUrl(god)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "8px 14px",
                border: `1px solid ${c.color}`,
                color: c.color,
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 700,
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              VIEW RELIC ↗
            </a>
          </section>
        );
      })()}

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
        <h2 className="mt-2 text-2xl font-light mb-8">The faces of the {c.doctrine} doctrine</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {featured.map((cit) => <CitizenCard key={cit.id} citizen={cit} size="sm" activated={activatedIds.has(cit.id)} />)}
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
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">THE LEDGER →</span></Link>
        </div>
      </section>
    </div>
  );
}
