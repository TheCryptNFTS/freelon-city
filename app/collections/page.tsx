import Link from "next/link";
import type { CSSProperties } from "react";
import { preload } from "react-dom";
import reveals from "@/components/HomeReveals.module.css";
import { COLLECTION_META, STATUS_EXPLAINERS, loadCollection } from "@/lib/collections-data";
import { isAgenticCollection } from "@/lib/agent-subject";
import { SignalInventoryPanel } from "@/components/SignalInventory";
import { GraveyardSection } from "@/components/archive/GraveyardSection";
import { CivTimeline } from "@/components/CivTimeline";
import { ActivationProof } from "@/components/ActivationProof";
import { CityWeekBand } from "@/components/CityWeekBand";

// T3 2026-06-11 — explicit share tags (a page-level openGraph block replaces
// the layout's wholesale, so the branded default image is restated here).
const COLLECTIONS_DESC =
  "Every collection in the FREELON CITY universe — each token is an AI agent you can open and chat with.";
export const metadata = {
  title: "The Universe · Collections",
  description: COLLECTIONS_DESC,
  openGraph: {
    title: "One city, six collections",
    description: COLLECTIONS_DESC,
    images: [{ url: "/api/og/universe?surface=collections", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "One city, six collections",
    description: COLLECTIONS_DESC,
    images: ["/api/og/universe?surface=collections"],
  },
};

// PERF 2026-06-11: serve this page as ISR — floors (1h fetch cache) and the
// graveyard ledger (300s fetch cache) were already revalidating underneath,
// but without a route-level revalidate the page rendered per-request and the
// whole document (including the LCP cover <img>) streamed behind the OpenSea
// floor lookups. 300s matches the graveyard cadence (its "ago" labels are
// rendered server-side) — same period /citizens uses.
export const revalidate = 300;

// Some collections' first on-chain record is video-only (Emile is .mp4),
// which can't render in an <img>. Pin those to a local still mirror.
// Pin covers to the re-treated local stills so /collections reads as the same
// gold-on-dark family as /demo (the on-chain first-token art is bright/off-brand
// for these three: emile is video-only, crypt/oogies are the original bright bg).
const COVER_OVERRIDE: Record<string, string> = {
  emile0x1908: "/og/art/emile.webp",
  "the-crypt-official": "/og/art/crypt.webp",
  oogies: "/og/art/oogies.webp",
};

// One representative token per collection for the cover art (first record).
function cover(slug: string): { img: string; total: number } {
  try {
    const d = loadCollection(slug);
    const img =
      COVER_OVERRIDE[slug] ||
      d.tokens.find((t) => t.img && !/\.(mp4|webm|mov)(\?|$)/i.test(t.img))?.img ||
      "";
    return { img, total: d.total };
  } catch {
    return { img: "", total: 0 };
  }
}

export default async function CollectionsIndex() {
  // PERF 2026-06-11: the first card's cover IS this page's LCP element, and
  // even with loading="eager" + fetchpriority Lighthouse still measured ~3.9s
  // of load delay (img discovered mid-document, behind the inventory panel).
  // An explicit preload puts it at the front of the request queue.
  // (Civilization page 2026-06-11: mint order leads, so the first cover is
  // The Crypt's local still, not Freelons'.)
  preload("/og/art/crypt.webp", { as: "image", fetchPriority: "high" });
  // TRUE mint order (Etherscan creation-tx dates, verified 2026-06-11):
  // The Crypt → Crypt TCG → OOGIES → Emile → SMILES → Freelons.
  const slugs = Object.keys(COLLECTION_META).sort(
    (a, b) => COLLECTION_META[a].order - COLLECTION_META[b].order,
  );
  const covers = Object.fromEntries(slugs.map((s) => [s, cover(s)]));

  // Civilization page (2026-06-11): the grid reads as city history — oldest
  // founders first, Freelons LAST as the newest citizens (never "the first").
  const cards = [
    ...slugs.map((slug) => ({
      slug,
      // Crypt TCG is the GAME — its card opens /crypt-tcg, which is now the
      // real front door to the playable build (2026-06-10: game shipped, door
      // wired). CTA promises PLAY because the page delivers it.
      href: slug === "crypttradingcards" ? "/crypt-tcg" : `/collections/${slug}`,
      play: slug === "crypttradingcards",
      title: COLLECTION_META[slug].title,
      status: COLLECTION_META[slug].status,
      statusColor: COLLECTION_META[slug].statusColor,
      kicker: COLLECTION_META[slug].kicker,
      est: COLLECTION_META[slug].est,
      epithet: COLLECTION_META[slug].epithet,
      blurb: COLLECTION_META[slug].blurb,
      img: covers[slug]?.img || "",
      total: covers[slug]?.total || 0,
      onsite: true,
      agentic: isAgenticCollection(slug),
    })),
    {
      slug: "freelons",
      href: "/citizens",
      title: "Freelons",
      status: "LIVE",
      statusColor: "var(--gold)",
      kicker: "THE CITIZENS · 4040 TOTAL",
      est: "EST. APR 2026 · 4,040",
      epithet: "The newest citizens.",
      blurb: "The 4040 citizens of FREELON CITY. Ten civilizations, seven castes, sixteen shapes.",
      img: "/og/art/freelons.webp",
      total: 4040,
      onsite: true,
      play: false,
      // Freelons is agentic (its citizens are the flagship agents).
      agentic: true,
    },
  ];

  return (
    <div style={{ maxWidth: "var(--maxw)", margin: "var(--s-6) auto", padding: "0 var(--pad)" }}>
      {/* Aliveness first (upgrade audit #117): live activation proof + the week
          band lead, so the page reads as a living city before the "dead / wild /
          lost" collection epithets. Both self-hide when there's nothing to show. */}
      <ActivationProof />
      <CityWeekBand />
      <header style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ ONE CITY · MANY KINDS OF CITIZEN</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1, margin: "12px 0 8px" }}>
          One city, many kinds of <em style={{ color: "var(--gold)", fontStyle: "normal" }}>citizen.</em>
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 680 }}>
          <strong style={{ color: "var(--ink)" }}>Freelons</strong> are the citizens — the ones you
          own and train.{" "}
          <strong style={{ color: "var(--ink)" }}>Oogies</strong> the wild ones.{" "}
          <strong style={{ color: "var(--ink)" }}>The Crypt</strong> the dead ones.{" "}
          <strong style={{ color: "var(--ink)" }}>Emile</strong> the emotional ones.{" "}
          <strong style={{ color: "var(--ink)" }}>SMILES</strong> the lost ones. And{" "}
          <strong style={{ color: "var(--ink)" }}>Crypt TCG</strong> is the card game built from
          The Crypt&apos;s combat records — the one you play instead of talk to. One signal, many
          collections — talk to any of them; train and keep a FREELON.
        </p>
        {/* V1 SIGNAL OS (2026-06-10): the three systems that cross every
            collection — stated once, plainly, on the page where all six meet.
            Wording per COPY_LEGAL_CHECKLIST ("stays with the NFT", never
            "on the token" / on-chain implications). */}
        <p style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-dim)", marginTop: 12 }}>
          <strong style={{ color: "var(--gold)" }}>Jobs</strong> — citizens work ·{" "}
          <strong style={{ color: "var(--gold)" }}>Memory</strong> — what they learn stays with the NFT ·{" "}
          <strong style={{ color: "var(--gold)" }}>Reputation</strong> — the record is public
        </p>
      </header>

      {/* Wallet ownership terminal across the connected collections (folded in
          from the former /archive). */}
      <SignalInventoryPanel />

      {/* THE ERA STRIP (2026-06-11) — six mint dates as city history on one
          gold line. The field's open gap: nobody narrates lineage on-site
          (.living-city/web3-worlds.md). Dates verified on Etherscan. */}
      <CivTimeline />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gridAutoRows: "1fr", gap: "var(--s-3)" }}>
        {cards.map((c, i) => {
          // PERF 2026-06-11: the first card's cover IS the page's LCP element —
          // lazy-loading it added a 21s load delay on simulated mobile. Only
          // that card loads eager/high-priority; everything below stays lazy
          // so nothing competes with the LCP download.
          const eager = i === 0;
          return (
            <Link
              key={c.slug}
              href={c.href}
              style={{ display: "block", height: "100%", textDecoration: "none", color: "inherit" }}
            >
              {/* Punch-list HIGH-IMPACT (2026-06-11): card chrome moved to
                  HomeReveals.module.css — mount-in stagger (70ms each) +
                  panel-premium hover (lift -4px, border brightens to
                  statusColor, 180ms quint). --sc feeds the per-collection
                  status color; the old `${statusColor}33` hex-suffix concat
                  was invalid against var() refs and dropped the border. */}
              <article
                className={`${reveals.collectionCard} ${reveals.cardIn}`}
                style={{ "--sc": c.statusColor, "--i": i } as CSSProperties}
              >
                {/* Square frame, art FILLS it (cover) so the gallery reads as
                    premium full-bleed renders, not thumbnails letterboxed in
                    black bars (visual audit flagship 2026-06-10). Near-square
                    PFP art crops ~0; the one portrait centre-crops cleanly. */}
                <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden", border: `1px solid color-mix(in srgb, ${c.statusColor} 20%, transparent)`, background: `linear-gradient(135deg, color-mix(in srgb, ${c.statusColor} 8%, transparent), rgba(0,0,0,0.55))` }}>
                  {c.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.img} alt={`${c.title} record`} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block", filter: "saturate(0.92) contrast(1.03)" }} />
                  )}
                  {(c as { agentic?: boolean }).agentic && (
                    <span
                      title="Every token here is an AI agent you can chat with"
                      style={{
                        position: "absolute", top: 8, left: 8,
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 9px", borderRadius: 999,
                        background: "rgba(8,8,10,0.72)", backdropFilter: "blur(4px)",
                        border: "1px solid var(--gold)", color: "var(--gold)",
                        fontFamily: "var(--mono2)", fontSize: 9.5, fontWeight: 700,
                        letterSpacing: "0.2em", textTransform: "uppercase",
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 6px var(--gold)" }} />
                      Agent
                    </span>
                  )}
                </div>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: c.statusColor, fontWeight: 700 }}>
                  {/* T8 2026-06-11: status legend — hover explains what the
                      status means in plain words (can I buy / use this now?).
                      Same title-attr pattern as the Agent badge above. */}
                  <span title={STATUS_EXPLAINERS[c.status]} style={{ cursor: "help" }}>● {c.status}</span>
                </header>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 22, lineHeight: 1.1, margin: 0, color: "var(--ink)" }}>{c.title}</h3>
                {/* The ROLE — each collection is a kind of citizen (founder framing
                    2026-06-08): citizens / wild / dead / emotional. */}
                <span style={{ fontFamily: "var(--mono2)", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: c.statusColor, fontWeight: 700, marginTop: -2 }}>{c.kicker}</span>
                {/* ERA LINE (2026-06-11) — deploy month-year + supply, Space
                    Mono because it's on-chain data (Etherscan creation-tx
                    facts, .living-city/lineage.md). */}
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>{c.est}</span>
                <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>{c.blurb}</p>
                {/* EPITHET (2026-06-11) — Parallel's faction-identity pattern:
                    one ≤5-word line compressed from the lore, set in the
                    display face so it SPEAKS; the functional verb stays below. */}
                <p style={{ fontFamily: "var(--display)", fontSize: 15, lineHeight: 1.2, margin: 0, color: "var(--ink)" }}>{c.epithet}</p>
                {/* ONE functional line per collection under the lore line —
                    Book identity chapter verb list (own+train · talk free ·
                    play). Tells a cold visitor what they can DO here. */}
                <p className={reveals.funcLine}>
                  <strong>
                    {c.slug === "freelons"
                      ? "Own + train"
                      : c.slug === "crypttradingcards"
                        ? "Play the card game"
                        : "Talk free"}
                  </strong>
                </p>
                <span style={{ marginTop: "auto", fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>
                  {(c as { play?: boolean }).play
                    ? "PLAY THE GAME →"
                    : (c as { agentic?: boolean }).agentic
                      ? "MEET THE AGENTS →"
                      : `BROWSE ${c.total.toLocaleString()} →`}
                </span>
              </article>
            </Link>
          );
        })}
      </div>

      {/* PROVENANCE — the anti-rug moat, folded in from the former /archive. */}
      <section className="archive-page__provenance" style={{ marginTop: "var(--s-6)" }}>
        <span className="archive-page__provenanceKicker">
          ⬡ ONE ARCHITECT · ONE WALLET · ONE SIGNAL
        </span>
        <p className="archive-page__provenanceText">
          Every collection in this universe was minted from the same architect&apos;s
          wallet. The signals were never lost — they were unfinished coordinates.
          FREELON CITY is the place they finally connect.
        </p>
      </section>

      {/* THE GRAVEYARD — abandoned citizens, folded in from the former /archive.
          Capped to the 5 most recent rows here (T7 2026-06-11) so the ledger
          doesn't dominate the universe page; the rest sits behind the
          section's FULL RECORD disclosure. */}
      <GraveyardSection limit={5} />
    </div>
  );
}
