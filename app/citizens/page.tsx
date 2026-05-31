import { getAllCitizens } from "@/lib/citizens";
import { FindCitizen } from "@/components/FindCitizen";
import { CitizensBrowser } from "@/components/CitizensBrowser";
import { PfpSection } from "@/components/citizens/PfpSection";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { CIVILIZATIONS, imageUrl } from "@/lib/constants";
import Link from "next/link";

export const metadata = { title: "Citizens" };

const ONE_TAGS: Record<number, { slug: string; sub: string }> = {
  1:    { slug: "origin-signal",   sub: "ONE OF ONE · SIGNAL BORN" },
  404:  { slug: "patient-zero",    sub: "ONE OF ONE · CHOIR OF STATIC" },
  1337: { slug: "genesis-hex",     sub: "ONE OF ONE · VOID KNIGHT" },
  4040: { slug: "the-final-signal", sub: "ONE OF ONE · THE THRONE" },
};

export default function Citizens() {
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
      <section className="citizens-hero">
        <span className="kicker">⬡ CITIZENS · 4040 TOTAL</span>
        <h1>Find your <em>citizen</em></h1>
        {/* 2026-05-31 — added a plain "what is this" line. The page used to
            open straight into "enter a token number", assuming the visitor
            knew what a citizen was or why they'd look. */}
        <p className="lead">
          Each <GlossaryTerm term="citizen">citizen</GlossaryTerm> is one of the
          4040 Freelon NFTs — a character with its own{" "}
          <GlossaryTerm term="civilization">civilization</GlossaryTerm>,{" "}
          <GlossaryTerm term="caste">caste</GlossaryTerm> and{" "}
          <GlossaryTerm term="shape">shape</GlossaryTerm>. Browsing is free;
          owning one is optional.
        </p>
        <p className="lead">Enter a token number 1—4040. The city returns the file.</p>
        <div className="finder">
          <FindCitizen />
        </div>
        {/* Jump link to the folded PFP studio (2026-05-31). */}
        <p style={{ marginTop: "var(--s-3)" }}>
          <a
            href="#pfp"
            style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", textDecoration: "none" }}
          >
            ⬡ HEX-FRAME YOUR AVATAR ↓
          </a>
        </p>
      </section>

      {/* Phase 3: CURATED FIRST. The original order put the 4040-item
          mass browser above the 4 one-of-ones — terrible mobile experience
          (endless scroll before seeing the brand's hero citizens). The
          ones / honoraries / legendaries are the FOMO + brand surface;
          they land first now. Mass browser is still anchor-linkable
          from the hero via #browse. */}

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
              <Link
                key={c.id}
                href={tag ? `/${tag.slug}` : `/citizens/${c.id}`}
                className="one-card"
                style={{ "--civ": civ?.color } as React.CSSProperties}
              >
                <div className="img-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(c.id)} alt={c.transmission_name || c.name} loading="lazy" />
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
                <img src={imageUrl(c.id)} alt={c.honoree} loading="lazy" />
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
                <img src={imageUrl(c.id)} alt={c.name} loading="lazy" />
                <div className="meta">
                  <span className="id">#{c.id.toString().padStart(4, "0")}</span>
                  <span className="shape">{c.shape}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Mass browser below curated. Anchor target for the hero "BROWSE ALL"
          link so users who specifically want the filter UI can jump down. */}
      <section className="citizens-section reveal" id="browse">
        <header className="sec-head">
          <span className="kicker">SEARCH · FILTER · {all.length} TOTAL</span>
          <h2>Browse all <em>{all.length}</em></h2>
        </header>
        <CitizensBrowser all={mini} rareTraitIds={rareTraitIds} rareThreshold={RARE_THRESHOLD} />
      </section>

      {/* ── FOLDED: PFP STUDIO (former /pfp) ── */}
      <PfpSection />

      <section style={{ marginTop: "var(--s-6)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-3)" }}>
          <Link className="btn btn-primary" href="/sync"><span className="ttl">FIND YOUR CITIZEN →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">EXPLORE CIVILIZATIONS →</span></Link>
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">THE LEDGER →</span></Link>
        </div>
      </section>
    </div>
  );
}
