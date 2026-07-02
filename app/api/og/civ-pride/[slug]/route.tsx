import { ImageResponse } from "next/og";
import { CIVILIZATIONS, type CivilizationSlug } from "@/lib/constants";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600";

function isCivSlug(s: string): s is CivilizationSlug {
  return s in CIVILIZATIONS;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug || !isCivSlug(slug)) {
    return new Response("Invalid civilization slug", { status: 400 });
  }
  const civ = CIVILIZATIONS[slug];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#050505",
          color: "#F5F2E8",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "row",
        }}
      >
        {/* Color split bar */}
        <div
          style={{
            width: 28,
            height: "100%",
            background: civ.color,
            display: "flex",
          }}
        />

        {/* Tinted civ background panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "60px",
            background: civ.bg,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: 6,
              color: "#C8A75D",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            {/* drawn hexagon — a literal ⬡ glyph tofus in satori (no font carries it) */}
            <svg width="16" height="18" viewBox="0 0 26 30" style={{ marginRight: 12 }}>
              <path d="M13 1 L25 8 L25 22 L13 29 L1 22 L1 8 Z" fill="none" stroke="#C8A75D" strokeWidth="3" />
            </svg>
            FREELON CITY · {civ.stamp}
          </div>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: 28,
                color: "#F5F2E8",
                letterSpacing: 6,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              I AM
            </span>
            <span
              style={{
                fontSize: 120,
                fontWeight: 700,
                color: civ.color,
                display: "flex",
                lineHeight: 1,
                marginTop: 12,
                letterSpacing: 2,
              }}
            >
              {civ.name.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 30,
                color: "#F5F2E8",
                letterSpacing: 4,
                fontFamily: "monospace",
                display: "flex",
                marginTop: 18,
              }}
            >
              DOCTRINE · {civ.doctrine.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 36,
                color: civ.color,
                display: "flex",
                marginTop: 22,
                letterSpacing: 4,
              }}
            >
              {civ.chant}
            </span>
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              gap: 60,
              paddingTop: 26,
              borderTop: "1px solid #1a1d26",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 13,
                  color: "#888",
                  letterSpacing: 3,
                  fontFamily: "monospace",
                  display: "flex",
                }}
              >
                POPULATION
              </span>
              <span
                style={{
                  fontSize: 32,
                  color: "#F5F2E8",
                  display: "flex",
                  marginTop: 4,
                }}
              >
                {civ.population}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 13,
                  color: "#888",
                  letterSpacing: 3,
                  fontFamily: "monospace",
                  display: "flex",
                }}
              >
                ESSENCE
              </span>
              <span
                style={{
                  fontSize: 26,
                  color: "#F5F2E8",
                  display: "flex",
                  marginTop: 4,
                }}
              >
                {civ.essence}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: 4,
              color: "#888",
              marginTop: 22,
            }}
          >
            <span style={{ display: "flex" }}>
              freeloncity.com/civilizations/{slug}
            </span>
            <span style={{ display: "flex", color: civ.color }}>
              {civ.stamp}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": CACHE },
    },
  );
}
