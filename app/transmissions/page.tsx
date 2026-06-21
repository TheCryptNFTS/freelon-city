import type { Metadata } from "next";
import Link from "next/link";
import { listTransmissions } from "@/lib/transmissions-store";
import { TransmissionCard } from "@/components/TransmissionCard";
import { TransmissionSubmit } from "@/components/TransmissionSubmit";
import { CIVILIZATIONS } from "@/lib/constants";

// Feed must reflect a just-submitted transmission, so it stays dynamic.
// (revalidate is a no-op under force-dynamic — removed to stop it misleading.)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transmissions ⬡",
  description: "Citizens of FREELON CITY send their own signal. Image + caption. Community signals + boosts; authors earn ⬡ royalties when others boost their work.",
  openGraph: {
    title: "Transmissions ⬡",
    description: "Send your signal to the city. Authors earn ⬡ royalties when others boost their work.",
    images: [{ url: "/api/og/hex-index", width: 1200, height: 630 }],
  },
};

type SearchParams = { by?: string; civ?: string };

export default async function TransmissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const by: "recent" | "score" = sp.by === "score" ? "score" : "recent";
  const civFilter = sp.civ && (CIVILIZATIONS as Record<string, unknown>)[sp.civ] ? sp.civ : null;

  const items = await listTransmissions({ by, civ: civFilter, limit: 60 });

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      <section
        style={{
          padding: "var(--s-6) var(--s-5)",
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(90deg, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.5) 100%), url(/atmos/manifesto.webp) center / cover no-repeat",
          border: "1px solid var(--line-2)",
          marginBottom: "var(--s-5)",
        }}
      >
        {/* SURFACE-REDUCTION 2026-06-09: this is the City Archive / proof wall —
            its one job is "see what characters made → create yours". Trimmed the
            lore + economy lines (HEX cost/prize don't belong on the front of the
            archive; they live on the submit panel + /earn). */}
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ CITY ARCHIVE</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 0.95, margin: "10px 0 8px", letterSpacing: "-0.02em" }}>
          What the city&apos;s characters<br /><em style={{ color: "var(--gold)", fontStyle: "normal" }}>made</em>.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", maxWidth: 540, lineHeight: 1.6 }}>
          A live wall of transmissions citizens created and posted. Make something with yours and add it.
        </p>
      </section>

      {/* Phase 3: submit action OPEN by default. "Submit" is the primary
          conversion event on this page; hiding it behind a collapsed
          details element was burying the funnel. Keeps the details
          shell so users can re-collapse if they prefer the gallery. */}
      <section style={{ marginBottom: "var(--s-5)" }}>
        <details
          open
          style={{
            border: "1px solid var(--gold)44",
            background: "linear-gradient(180deg, rgba(200,167,93,0.05), rgba(0,0,0,0.3))",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <summary
            style={{
              listStyle: "none",
              cursor: "pointer",
              padding: "var(--s-4) var(--s-5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <span className="kicker" style={{ color: "var(--gold)" }}>⬡ ADD YOUR TRANSMISSION</span>
              <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5 }}>
                Post an image + caption to the archive. (Cost + boost royalties shown below.)
              </p>
            </div>
            <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--gold)", border: "1px solid var(--gold)", padding: "6px 12px", borderRadius: 999 }}>
              OPEN ▾
            </span>
          </summary>
          <div id="submit" style={{ padding: "0 var(--s-5) var(--s-5)" }}>
            <TransmissionSubmit />
          </div>
        </details>
      </section>

      {/* Filters */}
      <section style={{ marginBottom: "var(--s-4)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="kicker">⬡ SORT</span>
        <FilterPill label="Recent" href={civFilter ? `/transmissions?by=recent&civ=${civFilter}` : "/transmissions"} active={by === "recent"} />
        <FilterPill label="Top score" href={civFilter ? `/transmissions?by=score&civ=${civFilter}` : "/transmissions?by=score"} active={by === "score"} />
        <span className="kicker" style={{ marginLeft: 16 }}>⬡ CIV</span>
        <FilterPill label="All" href={`/transmissions?by=${by}`} active={!civFilter} />
        {Object.entries(CIVILIZATIONS as Record<string, { name: string; color: string }>).slice(0, 10).map(([slug, def]) => (
          <FilterPill
            key={slug}
            label={def.name}
            href={`/transmissions?by=${by}&civ=${slug}`}
            active={civFilter === slug}
            color={def.color}
          />
        ))}
      </section>

      {/* Grid */}
      {items.length === 0 ? (
        <section style={{ padding: "var(--s-6) var(--s-5)", border: "1px dashed var(--line-2)", borderRadius: 14, textAlign: "center" }}>
          <span className="kicker">⬡ SILENCE</span>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", marginTop: 12 }}>
            No transmissions yet{civFilter ? ` for ${(CIVILIZATIONS as Record<string, { name: string }>)[civFilter].name}` : ""}.
            Be the first to send a signal.
          </p>
        </section>
      ) : (
        <section className="ui-auto-fit-cards" style={{ ["--min-w" as string]: "260px" }}>
          {items.map((t) => (
            <TransmissionCard key={t.id} t={t} />
          ))}
        </section>
      )}

      <section style={{ marginTop: "var(--s-7)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        {/* One job: send the viewer to create theirs. Primary = create; secondary
            = browse characters (the chooser). Economy link (/earn) removed — it's
            an advanced page, off the archive's job. */}
        <div className="ui-cta-row" style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/demo">
            <span className="ttl">MEET A CITIZEN · FREE →</span>
          </Link>
          <Link className="btn btn-secondary" href="/citizens">
            <span className="ttl">BROWSE CHARACTERS →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function FilterPill({
  label,
  href,
  active,
  color = "var(--gold)",
}: {
  label: string;
  href: string;
  active?: boolean;
  color?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: "5px 10px",
        border: `1px solid ${active ? color : "var(--line)"}`,
        borderRadius: 999,
        fontFamily: "var(--mono2)",
        fontSize: 10,
        letterSpacing: "0.15em",
        color: active ? color : "var(--ink-dim)",
        textTransform: "uppercase",
        textDecoration: "none",
        background: active ? `${color}10` : "transparent",
        fontWeight: 600,
      }}
    >
      {label}
    </Link>
  );
}
