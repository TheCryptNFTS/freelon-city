import Link from "next/link";
import { COLLECTION_META, loadCollection } from "@/lib/collections-data";
import { getFloors, formatFloor } from "@/lib/floor-prices";

export const metadata = {
  title: "Collections",
  description: "Every collection in the FREELON CITY universe — browse each one's full set on-site.",
};

// One representative token per collection for the cover art (first record).
function cover(slug: string): { img: string; total: number } {
  try {
    const d = loadCollection(slug);
    return { img: d.tokens.find((t) => t.img)?.img || "", total: d.total };
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
      blurb: "The 4040 citizens of FREELON CITY. Ten civilizations, seven castes, nine shapes.",
      img: "/heroes/emile.jpg",
      total: 4040,
      onsite: true,
    },
    ...slugs.map((slug) => ({
      slug,
      href: `/collections/${slug}`,
      title: COLLECTION_META[slug].title,
      status: COLLECTION_META[slug].status,
      statusColor: COLLECTION_META[slug].statusColor,
      kicker: COLLECTION_META[slug].kicker,
      blurb: COLLECTION_META[slug].blurb,
      img: covers[slug]?.img || "",
      total: covers[slug]?.total || 0,
      onsite: true,
    })),
  ];

  return (
    <div style={{ maxWidth: "var(--maxw)", margin: "var(--s-6) auto", padding: "0 var(--pad)" }}>
      <header style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ THE UNIVERSE · ALL COLLECTIONS</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1, margin: "12px 0 8px" }}>
          Every signal, <em style={{ color: "var(--gold)", fontStyle: "normal" }}>browsable.</em>
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 680 }}>
          Six collections, one city. Each one now has its own on-site explorer —
          search and filter the full set, then trade on OpenSea.
        </p>
      </header>

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
                <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 8, overflow: "hidden", border: `1px solid ${c.statusColor}33`, background: "rgba(0,0,0,0.5)" }}>
                  {c.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.img} alt={`${c.title} record`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(0.85) contrast(1.02)" }} />
                  )}
                </div>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: c.statusColor, fontWeight: 700 }}>
                  <span>● {c.status}</span>
                  {floor && <span style={{ color: "var(--gold)" }}>FLOOR {floor}</span>}
                </header>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 22, lineHeight: 1.1, margin: 0, color: "var(--ink)" }}>{c.title}</h3>
                <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>{c.blurb}</p>
                <span style={{ marginTop: "auto", fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>
                  BROWSE {c.total.toLocaleString()} →
                </span>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
