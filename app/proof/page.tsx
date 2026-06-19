import type { Metadata } from "next";
import Link from "next/link";

// /proof — the "only FREELON can do this" page. The render moat made legible:
// the prompt is FREE (we publish it), but the OUTPUT needs the token's own art +
// on-chain identity, which a blank AI tab can't fake. Honest before/after (the
// citizen's flat PFP -> its FREELON render) + the real prompt, copy-safe.
export const metadata: Metadata = {
  title: "Proof · Only your FREELON renders your character",
  description:
    "Anyone can prompt an AI. Only your FREELON renders YOUR character — same face, same number, same history — into any world. Here's the exact prompt. You still can't make this without owning one.",
  openGraph: {
    title: "Only your FREELON renders your character",
    description: "Same prompt. Only one knows your character. See the proof.",
    images: [{ url: "/api/og/universe?surface=proof", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Only your FREELON renders your character",
    description: "Same prompt. Only one knows your character.",
    images: ["/api/og/universe?surface=proof"],
  },
};

// The real, published scene prompt (the confidence play). This is a faithful
// rendering of the trait-injected template in lib/missions/image-gen.ts for
// Citizen #2268 — a Purple Oracle Analyst — in the Throne Room scene.
const PUBLISHED_PROMPT = `Keep the figure in the reference image EXACTLY: a hooded faceted figure
with a clean, readable silhouette, its faceted sculptural head/helm, the
glowing geometric HEX symbol where a face would be, its robes, its exact
colour palette and materials. Do NOT add a human face, eyes, hair, or turn
it into a person. Same character, same silhouette.

This is FREELON CITY citizen #2268 — a Purple Oracle SIGNAL BORN, an Analyst,
Common. Its hex face glows #B85CFF Oracle-signal light as the key light source.

Only change the SETTING to a cinematic scene: seated on a throne dais under
dramatic shafts of light, regal and still, the hall fading into shadow.

Premium dark cinematic render on a lifted near-black background, strong rim
lighting, a big bright hex eye and an extreme, readable silhouette.`;

export default function ProofPage() {
  return (
    <div className="home-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* HERO */}
      <section className="field-glow" style={{ textAlign: "center", marginBottom: "var(--s-6)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ PROOF</span>
        <h1 className="page-h1" style={{ margin: "12px 0 14px" }}>
          Anyone can prompt an AI.<br />
          Only your <em>FREELON</em> renders <em>your</em> character.
        </h1>
        <p className="lead" style={{ maxWidth: 620, margin: "0 auto", color: "var(--ink-2)", lineHeight: 1.6 }}>
          Same face. Same number. Same history. Dropped into any world — and every
          render carries the token&apos;s archive stamp, so the real ones are checkable.
          The prompt below is free. The character is yours.
        </p>
      </section>

      {/* BEFORE / AFTER — honest, same token (#2268) */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "var(--s-3)",
            alignItems: "center",
          }}
          className="proof-grid"
        >
          <figure style={{ margin: 0 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--line-2)", aspectRatio: "1 / 1", background: "#0a0a0c" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/proof/pfp-2268.jpg" alt="Citizen #2268 — the art you own" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <figcaption style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-dim)", marginTop: 10, textAlign: "center" }}>
              What you own · Citizen #2268
            </figcaption>
          </figure>

          <div aria-hidden style={{ fontFamily: "var(--mono2)", fontSize: 28, color: "var(--gold)", textAlign: "center" }}>→</div>

          <figure style={{ margin: 0 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid color-mix(in srgb, var(--gold) 45%, transparent)", aspectRatio: "1 / 1", background: "#0a0a0c", boxShadow: "0 0 40px color-mix(in srgb, var(--gold) 14%, transparent)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/proof/freelon-2268.png" alt="Citizen #2268 rendered into the Throne Room — branded, identity-locked" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <figcaption style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)", marginTop: 10, textAlign: "center" }}>
              What only you can make
            </figcaption>
          </figure>
        </div>
        <p style={{ textAlign: "center", fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", marginTop: "var(--s-3)" }}>
          Rendered from #2268&apos;s own art and its real on-chain identity — stamped
          <span style={{ color: "var(--gold)" }}> FC-ARCHIVE · PUR.520-2268 · ORACLE</span>. Not a lookalike. The same character.
        </p>
      </section>

      {/* THE PUBLISHED PROMPT — confidence play */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <header className="sec-head" style={{ textAlign: "center", marginBottom: "var(--s-3)" }}>
          <span className="kicker">⬡ HERE&apos;S THE EXACT PROMPT</span>
          <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(24px,3.5vw,36px)", margin: "8px 0" }}>
            Copy it. <em style={{ color: "var(--gold)", fontStyle: "normal" }}>You still can&apos;t make this.</em>
          </h2>
        </header>
        <pre
          className="panel-premium"
          style={{
            padding: "var(--s-5)",
            overflowX: "auto",
            fontFamily: "var(--mono2)",
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--ink)",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {PUBLISHED_PROMPT}
        </pre>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginTop: "var(--s-3)", maxWidth: 720 }}>
          Paste it into a blank AI: you get a stranger in a hood. No token number,
          no civilization, no record, no <em>character</em>. The output here is an
          <strong> edit of #2268&apos;s real art</strong>, keyed to its on-chain
          traits — which is the part the prompt can&apos;t carry. Same prompt. Only
          one knows your character.
        </p>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center" }}>
        <span className="kicker">⬡ TRY IT</span>
        <div className="ui-cta-row" style={{ justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary btn-lg" href="/demo">
            <span className="ttl">MEET A CITIZEN · FREE →</span>
          </Link>
          <a className="btn btn-secondary btn-lg" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
            <span className="ttl">OWN A FREELON →</span>
          </a>
        </div>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", marginTop: "var(--s-3)" }}>
          Own a FREELON · create with it · its record travels with the NFT.
        </p>
      </section>
    </div>
  );
}
