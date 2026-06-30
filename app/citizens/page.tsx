import { getAllCitizens } from "@/lib/citizens";
import { FindCitizen } from "@/components/FindCitizen";
import { YourAgentsRail } from "@/components/YourAgentsRail";
import { TopAgents } from "@/components/TopAgents";
import { CitizensBrowser } from "@/components/CitizensBrowser";
import { PfpSection } from "@/components/citizens/PfpSection";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { CIVILIZATIONS, gridImageUrl } from "@/lib/constants";
import Link from "next/link";

// T3 2026-06-11 — explicit share tags so X previews sell the roster instead of
// inheriting a generic default (page-level openGraph replaces the layout's, so
// the branded default image is restated here).
const CITIZENS_DESC =
  "Browse all 4,040 citizens of FREELON CITY — ten civilizations, nine shapes, four 1/1s. Every FREELON is an AI you can awaken and train.";
export const metadata = {
  title: "FREELONS · 4,040 Citizens You Can Own & Train",
  description: CITIZENS_DESC,
  openGraph: {
    title: "4,040 citizens you can own & train",
    description: CITIZENS_DESC,
    images: [{ url: "/api/og/universe?surface=citizens", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "4,040 citizens you can own & train",
    description: CITIZENS_DESC,
    images: ["/api/og/universe?surface=citizens"],
  },
};

// ISR: the curated/trait data is static, but the TopAgents rail reads the live
// progression leaderboard — revalidate so the showcase reflects real training.
export const revalidate = 300;

const ONE_TAGS: Record<number, { slug: string; sub: string }> = {
  1:    { slug: "origin-signal",   sub: "ONE OF ONE · SIGNAL BORN" },
  404:  { slug: "patient-zero",    sub: "ONE OF ONE · CHOIR OF STATIC" },
  1337: { slug: "genesis-hex",     sub: "ONE OF ONE · VOID KNIGHT" },
  4040: { slug: "the-final-signal", sub: "ONE OF ONE · THE THRONE" },
};

export default async function Citizens() {
  const all = getAllCitizens();
  const ones = all.filter((c) => c.tier === "One of One");
  const honoraries = all.filter((c) => c.tier === "Honorary");
  const legendaries = all.filter((c) => c.tier === "Legendary").slice(0, 12);

  const mini = all.map((c) => ({
    id: c.id,
    civilization: c.civilization,
    caste: c.caste,
    shape: c.shape,
    tier: c.tier,
    honoree: c.honoree || undefined,
    transmission_name: c.transmission_name || undefined,
    sub_archetype: c.sub_archetype || undefined,
    aura: c.aura || undefined,
    hex_state: c.hex_state || undefined,
  }));

  // Server-side compute: which citizens carry at least one RARE trait
  // value — defined as appearing ≤ RARE_THRESHOLD times across the
  // whole collection? Done here (not in the client browser) so we
  // don't ship the 4040-row counting work to every visitor.
  //
  // The dataset has no truly-1/1 trait values (min count is 8) — only
  // the 4 named One-of-Ones (IDs 1, 404, 1337, 4040) are unique. So
  // we surface the rarest trait carriers instead, which is what @Eldox
  // on Discord was actually looking for ("the Opera house collar").
  const RARE_THRESHOLD = 20;
  const TRAIT_KEYS: Array<keyof typeof mini[number]> = [
    "shape", "caste", "sub_archetype", "aura", "hex_state",
  ];
  const counts: Record<string, Map<string, number>> = {};
  for (const k of TRAIT_KEYS) counts[k as string] = new Map();
  for (const c of mini) {
    for (const k of TRAIT_KEYS) {
      const v = c[k] as string | undefined;
      if (!v || v === "None") continue;
      const m = counts[k as string];
      m.set(v, (m.get(v) || 0) + 1);
    }
  }
  const rareTraitIds = new Set<number>();
  for (const c of mini) {
    // One-of-Ones always qualify regardless of trait counts
    if (c.tier === "One of One") {
      rareTraitIds.add(c.id);
      continue;
    }
    for (const k of TRAIT_KEYS) {
      const v = c[k] as string | undefined;
      if (!v || v === "None") continue;
      const n = counts[k as string].get(v) || 0;
      if (n > 0 && n <= RARE_THRESHOLD) {
        rareTraitIds.add(c.id);
        break;
      }
    }
  }

  return (
    <div className="citizens-page">
      {/* SURFACE-REDUCTION 2026-06-09: /citizens does ONE job now — choose a
          citizen and create with it. Was 10 sections (museum + rarity showcase +
          agent rail + PFP guide + browse + footer funnel). Now ~3: hero → browse
          grid → one "Notable citizens" fold (the 1/1s + honoraries + legendaries +
          top-agents, MOVED off the chooser, not deleted) → PFP fold. */}
      <section className="citizens-hero field-glow">
        <span className="kicker">⬡ FREELONS · 4040 CITIZENS</span>
        <h1>Choose a <em>FREELON</em></h1>
        <p className="lead">
          Each <GlossaryTerm term="citizen">FREELON</GlossaryTerm> is an
          <strong> AI character you own and train</strong> — its work becomes a
          visible record that stays with the token. Pick one to create with it.{" "}
          <Link href="/proof" style={{ color: "var(--gold)", whiteSpace: "nowrap" }}>See what owners render →</Link>
        </p>

        {/* OWNER-FIRST 2026-06-09: connect → see YOUR characters → click straight
            into the create page (/agent/[id]). No typing a token number — that's
            a lookup pattern, not an owner flow. Renders nothing for non-holders,
            who get the lookup box + full browse grid below. */}
        <YourAgentsRail hrefBase="/agent/" heading="Your characters · tap to create" />

        {/* Secondary: look up ANY token (public viewer). Demoted below the owner
            rail — it's a lookup tool, not the primary owner action. */}
        <div className="finder">
          <p style={{ marginBottom: "var(--s-2)", color: "var(--ink-2)", fontSize: 13 }}>
            Or look up any citizen by number — a public viewer, not an ownership check.{" "}
            <Link href="/sync#connect" style={{ color: "var(--gold)" }}>Connect to see yours →</Link>
          </p>
          <FindCitizen />
        </div>
      </section>

      {/* THE CHOOSER — the page's one job. Lands right under the hero. */}
      <section className="citizens-section reveal" id="browse">
        <CitizensBrowser all={mini} rareTraitIds={rareTraitIds} rareThreshold={RARE_THRESHOLD} />
      </section>

      {/* NOTABLE CITIZENS — the brand/FOMO showcase (1/1s, honoraries,
          legendaries, top-trained agents). MOVED off the main chooser flow into
          one fold so it no longer fights "pick a citizen". Content preserved. */}
      <details className="collector-details citizens-section">
        <summary className="collector-summary">Notable citizens · the Four 1/1s, 35 Honoraries, Legendaries &amp; top-trained agents</summary>

        <TopAgents />

        <section className="citizens-section reveal">
          <header className="sec-head">
            <span className="kicker">ONE OF ONES</span>
            <h2>The <em>Four</em></h2>
          </header>
          <div className="ones-grid">
            {ones.map((c) => {
              const tag = ONE_TAGS[c.id];
              const civ = (CIVILIZATIONS as Record<string, { color: string }>)[c.civilization];
              return (
                <Link key={c.id} href={tag ? `/${tag.slug}` : `/citizens/${c.id}`} className="one-card" style={{ "--civ": civ?.color } as React.CSSProperties}>
                  <div className="img-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gridImageUrl(c.id)} alt={c.transmission_name || c.name} loading="lazy" />
                  </div>
                  <div className="meta">
                    <span className="id">#{c.id.toString().padStart(4, "0")}</span>
                    <h3>{c.transmission_name || c.name}</h3>
                    <span className="sub">{tag?.sub || `ONE OF ONE · ${c.caste}`}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="citizens-section reveal">
          <header className="sec-head">
            <span className="kicker">35 ELEVATED CITIZENS</span>
            <h2>The <em>Honoraries</em></h2>
          </header>
          <div className="honor-grid">
            {honoraries.map((c) => {
              const civ = (CIVILIZATIONS as Record<string, { color: string }>)[c.civilization];
              const handle = (c.honoree_handle || "").replace(/^@/, "") || String(c.id);
              return (
                <Link key={c.id} href={`/tribute/${handle}`} className="honor-card" style={{ "--civ": civ?.color } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gridImageUrl(c.id)} alt={c.honoree} loading="lazy" />
                  <div className="meta">
                    <span className="id">#{c.id.toString().padStart(4, "0")}</span>
                    <span className="name">{c.honoree}</span>
                    <span className="handle">{c.honoree_handle}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="citizens-section reveal">
          <header className="sec-head">
            <span className="kicker">40 TOTAL · 12 SHOWN</span>
            <h2>The <em>Legendaries</em></h2>
          </header>
          <div className="legendary-grid">
            {legendaries.map((c) => {
              const civ = (CIVILIZATIONS as Record<string, { color: string }>)[c.civilization];
              return (
                <Link key={c.id} href={`/citizens/${c.id}`} className="legendary-card" style={{ "--civ": civ?.color } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gridImageUrl(c.id)} alt={c.name} loading="lazy" />
                  <div className="meta">
                    <span className="id">#{c.id.toString().padStart(4, "0")}</span>
                    <span className="shape">{c.shape}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </details>

      {/* PFP studio — moved off the main surface into a fold (was a full section). */}
      <details className="collector-details citizens-section" id="pfp">
        <summary className="collector-summary">⬡ Hex-frame your avatar · PFP studio</summary>
        <PfpSection />
      </details>
    </div>
  );
}
