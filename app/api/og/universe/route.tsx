import { ImageResponse } from "next/og";

export const runtime = "edge";

// Shareable OG card — the real front door (every X/Discord/OpenSea link
// preview).
//
// 2026-06-08 rebuild: the previous default card sold SCOPE + LORE ("one
// universe · six collections · one arcade · when the HEX vanished…"). A
// stranger seeing a link preview can't tell what the PRODUCT is. This card
// now sells ONE FREELON: a large portrait + the plain-words pitch (own it,
// train it, it remembers you + keeps a visible work history). Engagement
// framing only — no resale-premium / value claims.
//
// The old scope card is preserved as a still-callable variant at
// `?v=universe` (it names the six collections; useful where the SCOPE is the
// point). Default (homepage / shares) renders the FREELON product card.
//
// Art is mirrored locally under /public/og/art (PNG, same-origin) so the edge
// render stays fast + reliable and never depends on a remote CDN fetch.

const PIECES: { name: string; tag: string; color: string; img: string }[] = [
  { name: "Freelons", tag: "4040 CITIZENS", color: "#C8A75D", img: "/og/art/freelons.png" },
  { name: "The Crypt", tag: "DEAD SIGNALS", color: "#4CFF7A", img: "/og/art/crypt.png" },
  { name: "Combat Archives", tag: "TEN GODS", color: "#FF6A3D", img: "/og/art/combat.png" },
  { name: "OOGIES", tag: "ANCIENT SPECIES", color: "#B85CFF", img: "/og/art/oogies.png" },
  { name: "Emile", tag: "MEMORY", color: "#FF5CB4", img: "/og/art/emile.png" },
  { name: "SMILES", tag: "COLLAPSE", color: "#FFD24A", img: "/og/art/smiles.png" },
];

// ── DEFAULT: product-first FREELON card ──────────────────────────────────
function FreelonCard(src: (p: string) => string) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "row",
        background: "#0B0B0D",
        color: "#F5F2E8",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* faint gold glow, top-right */}
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -180,
          width: 620,
          height: 620,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(200,167,93,0.16) 0%, rgba(200,167,93,0) 70%)",
          display: "flex",
        }}
      />

      {/* LEFT — one large FREELON portrait */}
      <div
        style={{
          width: 560,
          height: "630px",
          display: "flex",
          position: "relative",
          borderRight: "1px solid rgba(200,167,93,0.28)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src("/og/art/freelons.png")}
          width="560"
          height="630"
          alt=""
          style={{ width: "560px", height: "630px", objectFit: "cover" }}
        />
        {/* gentle fade into the panel so the seam reads intentional */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 160,
            height: "630px",
            background: "linear-gradient(90deg, rgba(11,11,13,0) 0%, rgba(11,11,13,0.92) 100%)",
            display: "flex",
          }}
        />
      </div>

      {/* RIGHT — kicker · title · subline */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 64px",
          gap: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: "#E9C984",
            textTransform: "uppercase",
          }}
        >
          ⬡ An AI character you own
        </div>
        <div
          style={{
            fontSize: 124,
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            color: "#F5F2E8",
            display: "flex",
          }}
        >
          FREELONS
        </div>
        <div
          style={{
            fontSize: 32,
            lineHeight: 1.32,
            color: "#C8A75D",
            letterSpacing: "0.01em",
            display: "flex",
            maxWidth: 520,
          }}
        >
          Own it. Train it. It remembers you — and keeps a visible work history.
        </div>
      </div>
    </div>
  );
}

// ── VARIANT (?v=universe): the original scope/contact-sheet card ─────────
function UniverseCard(src: (p: string) => string) {
  return (
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
  );
}

export function GET(req: Request) {
  const src = (p: string) => new URL(p, req.url).toString();
  const variant = new URL(req.url).searchParams.get("v");

  return new ImageResponse(
    variant === "universe" ? UniverseCard(src) : FreelonCard(src),
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
