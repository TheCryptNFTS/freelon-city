import { CASTES } from "@/lib/constants";

// Folded in from the former /castes page (2026-05-31 consolidation).
// The 7 social roles, derived deterministically from on-chain Hex State +
// Tier. Markup + inline styles mirror the original caste rows so the
// aesthetic is unchanged — only the wrapping <section id="castes"> is new.
export function CastesSection() {
  return (
    <section id="castes" className="civ-fold">
      <span className="kicker">⬡ SOCIAL HIERARCHY · 7 CASTES</span>
      <h2 className="civ-fold__h">
        Every city has a structure<br />
        <em>every citizen has a place</em>
      </h2>
      <p className="lead" style={{ maxWidth: 640, marginTop: "var(--s-3)" }}>
        7 castes derived deterministically from on-chain traits. Hex State +
        Tier determine where you stand.
      </p>

      <div style={{ marginTop: "var(--s-6)", display: "grid", gap: "var(--s-2)" }}>
        {Object.entries(CASTES).map(([name, c]) => (
          <article
            key={name}
            className="caste-row"
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "var(--s-4)",
              padding: "var(--s-4)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              transition: "border-color 160ms ease",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 26,
                  color: "var(--gold-bright)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                {name}
              </div>
              <div style={{ marginTop: 6, color: "var(--ink-2)", fontSize: 14 }}>{c.role}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 28, color: "var(--gold-bright)" }}>
                {c.count}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "var(--ink-dim)",
                  textTransform: "uppercase",
                }}
              >
                citizens
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
