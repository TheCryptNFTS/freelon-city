import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCitizen } from "@/lib/citizens";
import { imageUrl } from "@/lib/constants";
import { CitizenLifeHero } from "@/components/CitizenLifeHero";

/**
 * /embed/[id] — the "Living PFP" widget.
 *
 * A chrome-free, iframe-able square (no site Header/Footer — see ChromeGate; no
 * X-Frame-Options + frame-ancestors * — see next.config) that any holder can drop
 * into their own page. It is deliberately INERT: a breathing, awakening living
 * portrait plus one link out to the citizen page. No wallet, no form, no money —
 * which is exactly what makes opening cross-origin framing on this one path safe.
 *
 * Every embed is a distribution node: the widget carries the FREELON look and a
 * "powered by FREELON CITY" link back to the collection.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  const name = c?.transmission_name || c?.honoree || `Citizen #${tid.toString().padStart(4, "0")}`;
  return {
    title: `${name} — living`,
    // Embeds should not compete with the real pages in search.
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) notFound();

  const id4 = tid.toString().padStart(4, "0");
  const name = c.transmission_name || c.honoree || `Citizen #${id4}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#07060a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", width: "min(100vw, 100vh)", height: "min(100vw, 100vh)" }}>
        <CitizenLifeHero
          tokenId={tid}
          src={imageUrl(tid)}
          name={name}
          fill
          frame={false}
          neglectDeath={false}
        />

        {/* wordmark — small, top-left */}
        <span
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            fontFamily: "var(--mono2)",
            fontSize: 9,
            letterSpacing: "0.24em",
            color: "rgba(245,242,232,0.55)",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
            pointerEvents: "none",
          }}
        >
          ⬡ FREELON CITY · #{id4}
        </span>

        {/* the whole tile links out (new top-level tab — escapes the iframe) */}
        <a
          href={`https://www.freeloncity.com/citizens/${tid}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name} on FREELON CITY`}
          style={{ position: "absolute", inset: 0, zIndex: 5 }}
        />

        {/* powered-by pill — bottom-right, also the click affordance */}
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 12,
            fontFamily: "var(--mono2)",
            fontSize: 9,
            letterSpacing: "0.16em",
            color: "rgba(245,242,232,0.7)",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(245,242,232,0.14)",
            borderRadius: 999,
            padding: "4px 9px",
            pointerEvents: "none",
          }}
        >
          open ↗
        </span>
      </div>
    </div>
  );
}
