import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Branded OG card for the /crypt-tcg door (2026-07-02 war-room).
 * The door previously unfurled public/og/combat-archives.jpg raw: 1536×1024
 * (3:2 — X crops it) with zero text, brand, or destination. Same proven
 * image-left / meta-right layout as the citizen card; the art stays the
 * hook, the right panel says what it is and where it lives.
 */
export function GET(req: Request) {
  const art = new URL("/og/combat-archives.jpg", req.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#0B0B0D",
          color: "#F5F2E8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Left: the combat art, edge-lit toward the panel */}
        <div
          style={{
            width: "630px",
            height: "630px",
            display: "flex",
            position: "relative",
            borderRight: "4px solid #C8A75D",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art}
            width="630"
            height="630"
            alt=""
            style={{ width: "630px", height: "630px", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "linear-gradient(90deg, transparent 62%, rgba(200,167,93,0.28) 100%)",
            }}
          />
        </div>

        {/* Right: what it is, where it lives */}
        <div
          style={{
            flex: 1,
            padding: "64px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 20,
                letterSpacing: 6,
                color: "#C8A75D",
                fontFamily: "monospace",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* drawn hexagon — a literal ⬡ glyph tofus in satori */}
              <svg width="17" height="20" viewBox="0 0 26 30" style={{ marginRight: 12 }}>
                <path d="M13 1 L25 8 L25 22 L13 29 L1 22 L1 8 Z" fill="none" stroke="#C8A75D" strokeWidth="3" />
              </svg>
              FREELON CITY · CARD GAME
            </div>

            <div
              style={{
                marginTop: 36,
                fontSize: 92,
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                color: "#F5F2E8",
                display: "flex",
              }}
            >
              CRYPT TCG
            </div>

            <div style={{ marginTop: 22, fontSize: 28, color: "#E9C984", display: "flex" }}>
              Command the dead. Duel for the pyre.
            </div>

            <div style={{ marginTop: 18, fontSize: 22, color: "rgba(245,242,232,0.6)", display: "flex" }}>
              Solo deck-builder vs the AI · daily trial · free in the browser
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize: 20,
              letterSpacing: 3,
              color: "#C8A75D",
            }}
          >
            PLAYABLE NOW · FREELONCITY.COM/CRYPT-TCG
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, s-maxage=86400" },
    },
  );
}
