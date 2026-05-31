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
// 2026-05-31 rebuild: the previous version showed EMPTY colored boxes (no
// art) which read as a wireframe — founder: "this image is awful." This
// card now leads with REAL on-chain art: a contact-sheet of one
// representative record per collection. Art is mirrored locally under
// /public/og/art (PNG, same-origin) so the edge render stays fast + reliable
// and never depends on a remote CDN fetch mid-render.

const PIECES: { name: string; tag: string; color: string; img: string }[] = [
  { name: "Freelons", tag: "4040 CITIZENS", color: "#C8A75D", img: "/og/art/freelons.png" },
  { name: "The Crypt", tag: "DEAD SIGNALS", color: "#4CFF7A", img: "/og/art/crypt.png" },
  { name: "Combat Archives", tag: "TEN GODS", color: "#FF6A3D", img: "/og/art/combat.png" },
  { name: "OOGIES", tag: "ANCIENT SPECIES", color: "#B85CFF", img: "/og/art/oogies.png" },
  { name: "Emile", tag: "MEMORY", color: "#FF5CB4", img: "/og/art/emile.png" },
  { name: "SMILES", tag: "COLLAPSE", color: "#FFD24A", img: "/og/art/smiles.png" },
];

export function GET(req: Request) {
  const src = (p: string) => new URL(p, req.url).toString();

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
          padding: "54px 56px",
          position: "relative",
        }}
      >
        {/* faint hex glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -160,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,184,255,0.18) 0%, rgba(0,184,255,0) 70%)",
            display: "flex",
          }}
        />

        {/* headline block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 22,
              letterSpacing: "0.24em",
              color: "#00B8FF",
              textTransform: "uppercase",
            }}
          >
            One universe · six collections · one arcade
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: "#F5F2E8",
              display: "flex",
            }}
          >
            FREELON CITY
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#C8A75D",
              letterSpacing: "0.02em",
              display: "flex",
            }}
          >
            When the HEX vanished, a city formed around the signal.
          </div>
        </div>

        {/* the pieces — a REAL art tile per connected collection */}
        <div style={{ display: "flex", gap: 12 }}>
          {PIECES.map((p) => (
            <div
              key={p.name}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                height: 250,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#11152E",
              }}
            >
              {/* real on-chain record */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src(p.img)}
                width="180"
                height="168"
                alt=""
                style={{ width: "100%", height: "168px", objectFit: "cover" }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  padding: "12px 12px 14px",
                  borderTop: `3px solid ${p.color}`,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#F5F2E8",
                    lineHeight: 1.0,
                    display: "flex",
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.10em",
                    color: p.color,
                    textTransform: "uppercase",
                    display: "flex",
                  }}
                >
                  {p.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Static composition — cache hard so social platforms hit the CDN
        // cache instead of re-rendering (re-renders are what make cards
        // silently fall back to a placeholder).
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
