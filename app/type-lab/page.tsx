/**
 * /type-lab — TEMPORARY font comparison route (studio-pass Track 2).
 *
 * Renders the current Satoshi stack against 3 free-commercial-license
 * candidate pairings, using real site content (kicker / h1 / sub / civ
 * name / body / mono labels) so the choice is made in context, not in
 * the abstract. A human picks; then the winner gets wired into the
 * global next/font config and THIS ROUTE IS DELETED.
 *
 * All fonts are free for commercial web use:
 *   - Satoshi, Clash Display        → Fontshare (Indian Type Foundry), free
 *   - Space Grotesk, Archivo,
 *     Space Mono, IBM Plex Mono     → Google Fonts (OFL), free
 *
 * NOT wired into the design system — fonts load via @import here only.
 */
export const metadata = { title: "Type Lab · internal" };

const KICKER = '⬡ "THE HEX DISAPPEARED. THE CITY FORMED AROUND THE SIGNAL."';
const BODY =
  "Every citizen belongs to one of ten civilizations. Your civilization is your color, your chant, your earning bonus, and the side you take when the city splits.";

type Pairing = {
  id: string;
  label: string;
  license: string;
  display: string;
  mono: string;
  note: string;
};

const PAIRINGS: Pairing[] = [
  {
    id: "current",
    label: "CURRENT — Satoshi + IBM Plex Mono",
    license: "Fontshare + Google OFL · both free",
    display: "'Satoshi','Helvetica Neue',Arial,sans-serif",
    mono: "'IBM Plex Mono',ui-monospace,monospace",
    note: "Control. Clean geometric grotesque. Reads neutral / slightly generic — competent but no edge.",
  },
  {
    id: "clash",
    label: "A · EDITORIAL GRAFFITI — Clash Display + Space Mono",
    license: "Fontshare + Google OFL · both free",
    display: "'Clash Display','Satoshi',sans-serif",
    mono: "'Space Mono',ui-monospace,monospace",
    note: "Fashion-grade confidence (Off-White energy). Clash has weight + attitude; Space Mono labels feel hand-set, less corporate than Plex.",
  },
  {
    id: "spacegrotesk",
    label: "B · TECHNO-NOIR — Space Grotesk + IBM Plex Mono",
    license: "Google OFL · free",
    display: "'Space Grotesk','Satoshi',sans-serif",
    mono: "'IBM Plex Mono',ui-monospace,monospace",
    note: "Retro-future grotesque that holds neon well. Contemporary, signal-y, slightly quirky letterforms. Safe + current.",
  },
  {
    id: "archivo",
    label: "C · INDUSTRIAL POSTER — Archivo Expanded + IBM Plex Mono",
    license: "Google OFL · free",
    display: "'Archivo','Satoshi',sans-serif",
    mono: "'IBM Plex Mono',ui-monospace,monospace",
    note: "Loud, wide, poster/graffiti energy. Maximum street-poster impact; risk = can feel heavy at body sizes.",
  },
];

export default function TypeLab() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px 96px" }}>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Archivo:wght@400;600;800&family=Space+Mono:wght@400;700&display=swap');
        .tl-block { border-top: 1px solid var(--line); padding: 40px 0 8px; }
        .tl-meta { font-family: var(--mono2); font-size: 11px; letter-spacing: .18em; color: var(--ink-dim); text-transform: uppercase; margin-bottom: 4px; }
        .tl-license { font-family: var(--mono2); font-size: 10px; letter-spacing: .12em; color: var(--neon-cyan); margin-bottom: 24px; }
        .tl-note { font-family: var(--sans); font-size: 13px; color: var(--ink-2); line-height: 1.6; max-width: 60ch; margin: 18px 0 0; }
        .tl-kicker { font-size: 11px; letter-spacing: .24em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 14px; }
        .tl-h1 { font-size: clamp(44px, 7vw, 84px); line-height: .9; letter-spacing: -.02em; text-transform: uppercase; margin: 0 0 14px; color: var(--ink); }
        .tl-h1 em { font-style: normal; color: var(--neon-cyan); text-shadow: var(--neon-glow-cyan); }
        .tl-sub { font-size: 16px; line-height: 1.5; color: var(--ink-2); margin: 0 0 24px; max-width: 50ch; }
        .tl-civ { font-size: clamp(28px, 4vw, 44px); letter-spacing: -.01em; text-transform: uppercase; margin: 0 0 8px; color: var(--ink); }
        .tl-body { font-size: 15px; line-height: 1.65; color: var(--ink-2); max-width: 58ch; }
      `}</style>

      <p style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: ".2em", color: "var(--neon-cyan)", textTransform: "uppercase" }}>
        ⬡ TYPE LAB · INTERNAL · PICK ONE
      </p>
      <h2 style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)", margin: "8px 0 0" }}>
        Same content, four type systems. Choose the one that reads
        &ldquo;clean graffiti + neon noir&rdquo; without trying too hard.
      </h2>

      {PAIRINGS.map((p) => (
        <section className="tl-block" key={p.id}>
          <div className="tl-meta">{p.label}</div>
          <div className="tl-license">{p.license}</div>

          <div style={{ fontFamily: p.mono }} className="tl-kicker">{KICKER}</div>
          <h1 style={{ fontFamily: p.display, fontWeight: 700 }} className="tl-h1">
            The city <em>remembers</em><br />what you carry.
          </h1>
          <p style={{ fontFamily: p.display, fontWeight: 400 }} className="tl-sub">
            4040 citizens across 10 civilizations. Sealed supply.
          </p>

          <div style={{ fontFamily: p.mono }} className="tl-kicker">⬡ TEN CIVILIZATIONS</div>
          <h2 style={{ fontFamily: p.display, fontWeight: 600 }} className="tl-civ">Synthesis</h2>
          <p style={{ fontFamily: p.display, fontWeight: 400 }} className="tl-body">{BODY}</p>

          <p className="tl-note">{p.note}</p>
        </section>
      ))}
    </div>
  );
}
