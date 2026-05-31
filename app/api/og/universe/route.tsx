import { ImageResponse } from "next/og";

export const runtime = "edge";

// Shareable OG card for the homepage / whole universe.
//
// The old homepage share image (/og/home.jpg) sold a single PFP drop. The
// site is a multi-collection universe (six collections + a trading-card war
// + an arcade), and the biggest comprehension gap is that a stranger thinks
// "just another Freelons collection." This card names the pieces up front
// so the very first thing a link-preview shows is the SCOPE.
//
// Font-free (system-ui) and self-contained — no remote image/font fetch — to
// match the other og routes and stay fast + reliable at the edge.

const PIECES: { name: string; tag: string; color: string }[] = [
  { name: "Freelons", tag: "4040 CITIZENS", color: "#C8A75D" },
  { name: "The Crypt", tag: "DEAD SIGNALS", color: "#4CFF7A" },
  { name: "Combat Archives", tag: "TEN GODS", color: "#FF6A3D" },
  { name: "OOGIES", tag: "ANCIENT SPECIES", color: "#B85CFF" },
  { name: "Emile", tag: "MEMORY", color: "#FF5CB4" },
  { name: "SMILES", tag: "COLLAPSE", color: "#FFD24A" },
  { name: "Arcade", tag: "SIX GAMES", color: "#00B8FF" },
];

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0E27",
          color: "#F5F2E8",
          fontFamily: "system-ui, sans-serif",
          padding: "64px",
          position: "relative",
        }}
      >
        {/* faint hex glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,184,255,0.20) 0%, rgba(0,184,255,0) 70%)",
            display: "flex",
          }}
        />

        {/* kicker — no ⬡ glyph: system-ui at the edge renders it as tofu. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 26,
            letterSpacing: "0.22em",
            color: "#00B8FF",
            textTransform: "uppercase",
          }}
        >
          One universe · six collections · one arcade
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: 132,
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              color: "#F5F2E8",
              display: "flex",
            }}
          >
            FREELON CITY
          </div>
          <div
            style={{
              fontSize: 34,
              color: "#C8A75D",
              letterSpacing: "0.04em",
              display: "flex",
            }}
          >
            When the HEX vanished, a city formed around the signal.
          </div>
        </div>

        {/* the pieces — a tile per connected layer */}
        <div style={{ display: "flex", gap: 12 }}>
          {PIECES.map((p) => (
            <div
              key={p.name}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "16px 14px 18px",
                borderTop: `4px solid ${p.color}`,
                border: "1px solid rgba(255,255,255,0.10)",
                borderTopWidth: 4,
                borderTopColor: p.color,
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#F5F2E8",
                  lineHeight: 1.05,
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontSize: 14,
                  letterSpacing: "0.10em",
                  color: p.color,
                  textTransform: "uppercase",
                }}
              >
                {p.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
