import Link from "next/link";
import { COLLECTION_META, loadCollection } from "@/lib/collections-data";
import { getFloors, formatFloor } from "@/lib/floor-prices";
import { isAgenticCollection } from "@/lib/agent-subject";
import { SignalInventoryPanel } from "@/components/SignalInventory";
import { GraveyardSection } from "@/components/archive/GraveyardSection";

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
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "One city, six collections",
    description: COLLECTIONS_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

// Some collections' first on-chain record is video-only (Emile is .mp4),
// which can't render in an <img>. Pin those to a local still mirror.
// Pin covers to the re-treated local stills so /collections reads as the same
// gold-on-dark family as /demo (the on-chain first-token art is bright/off-brand
// for these three: emile is video-only, crypt/oogies are the original bright bg).
const COVER_OVERRIDE: Record<string, string> = {
  emile0x1908: "/og/art/emile.png",
  "the-crypt-official": "/og/art/crypt.png",
  oogies: "/og/art/oogies.png",
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
  const slugs = Object.keys(COLLECTION_META);
  const floors = await getFloors([...slugs, "freelons"]);
  const covers = Object.fromEntries(slugs.map((s) => [s, cover(s)]));

  // Freelons leads — it's the flagship and already has its own deep browser.
  const cards = [
    {
      slug: "freelons",
      href: "/citizens",
      title: "Freelons",
      status: "LIVE",
      statusColor: "var(--gold)",
      kicker: "THE CITIZENS · 4040 TOTAL",
      blurb: "The 4040 citizens of FREELON CITY. Ten civilizations, seven castes, sixteen shapes.",
      img: "/og/art/freelons.png",
      total: 4040,
      onsite: true,
    },
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
      blurb: COLLECTION_META[slug].blurb,
      img: covers[slug]?.img || "",
      total: covers[slug]?.total || 0,
      onsite: true,
      agentic: isAgenticCollection(slug),
    })),
  ];
  // Freelons leads and is agentic (its citizens are the flagship agents).
  cards[0] = { ...cards[0], agentic: true } as typeof cards[0] & { agentic: boolean };

  return (
    <div style={{ maxWidth: "var(--maxw)", margin: "var(--s-6) auto", padding: "0 var(--pad)" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gridAutoRows: "1fr", gap: "var(--s-3)" }}>
        {cards.map((c) => {
          const floor = formatFloor(floors[c.slug]);
          return (
            <Link
              key={c.slug}
              href={c.href}
              style={{ display: "block", height: "100%", textDecoration: "none", color: "inherit" }}
            >
              <article
                style={{
                  padding: "var(--s-4)",
                  border: `1px solid ${c.statusColor}33`,
                  background: `linear-gradient(135deg, ${c.statusColor}08, rgba(0,0,0,0.4))`,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  height: "100%",
                }}
              >
                {/* Square frame, art FILLS it (cover) so the gallery reads as
                    premium full-bleed renders, not thumbnails letterboxed in
                    black bars (visual audit flagship 2026-06-10). Near-square
                    PFP art crops ~0; the one portrait centre-crops cleanly. */}
                <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden", border: `1px solid ${c.statusColor}33`, background: `linear-gradient(135deg, ${c.statusColor}14, rgba(0,0,0,0.55))` }}>
                  {c.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.img} alt={`${c.title} record`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block", filter: "saturate(0.92) contrast(1.03)" }} />
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
                  <span>● {c.status}</span>
                  {floor && <span style={{ color: "var(--gold)" }}>FLOOR {floor}</span>}
                </header>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 22, lineHeight: 1.1, margin: 0, color: "var(--ink)" }}>{c.title}</h3>
                {/* The ROLE — each collection is a kind of citizen (founder framing
                    2026-06-08): citizens / wild / dead / emotional. */}
                <span style={{ fontFamily: "var(--mono2)", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: c.statusColor, fontWeight: 700, marginTop: -2 }}>{c.kicker}</span>
                <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>{c.blurb}</p>
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

      {/* THE GRAVEYARD — abandoned citizens, folded in from the former /archive. */}
      <GraveyardSection />
    </div>
  );
}
