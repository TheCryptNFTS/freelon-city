import Link from "next/link";
import type { Metadata } from "next";
import { getHonoraries } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "Thirty-five honorary citizens named into the FREELON CITY record.";
export const metadata: Metadata = {
  title: "Tribute · The Named",
  description: PAGE_DESC,
  openGraph: {
    title: "Tribute · The Named",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tribute · The Named",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

export default function TributeIndex() {
  const hs = getHonoraries();
  return (
    /* Archival visual pass 2026-05-26: .home-page wrapper triggers
       the scoped archival system (textures, void bg, archival tokens).
       Existing .tribute-* classes stay so layout is unchanged. The
       additional .home-page .tribute-cell overrides in globals.css
       flatten the card chrome to match /archive + /home. */
    <div className="home-page tribute-index">
      <section className="tribute-hero">
        <span className="kicker">⬡ THIRTY-FIVE NAMED CITIZENS</span>
        <h1>The <em>honoraries</em></h1>
        <p className="lead">
          Thirty-five citizens carry the name of a human who shaped the
          signal. Each is permanent in the record.
        </p>
      </section>
      <section className="tribute-grid-wrap">
        <div className="tribute-grid">
          {hs.map((h) => {
            const handle = (h.honoree_handle || "").replace(/^@/, "");
            const civ = (CIVILIZATIONS as Record<string, { color: string; doctrine: string }>)[h.civilization];
            return (
              <Link
                key={h.id}
                href={`/tribute/${handle || h.id}`}
                className="tribute-cell scan-card"
                style={{ "--civ": civ?.color } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(h.id)} alt={h.honoree} loading="lazy" />
                <div className="meta">
                  <div className="id">#{h.id.toString().padStart(4, "0")}</div>
                  <div className="name">{h.honoree}</div>
                  <div className="handle">{h.honoree_handle}</div>
                  <div className="civ">{civ?.doctrine?.toUpperCase()}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: "var(--s-6)", maxWidth: "var(--maxw)", margin: "var(--s-6) auto 0", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        {/* CTA cleanup 2026-05-26: dropped "THE LEDGER → /earn" (gated
           utility moved behind /sync) and "BROWSE ALL 4040" (moved to
           citizen browser flow). Two CTAs only. */}
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/sync"><span className="ttl">ENTER THE CITY →</span></Link>
          <Link className="btn btn-secondary" href="/civilizations"><span className="ttl">EXPLORE CIVILIZATIONS →</span></Link>
        </div>
      </section>
    </div>
  );
}
