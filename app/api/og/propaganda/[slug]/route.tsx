import { ImageResponse } from "next/og";
import { CIVILIZATIONS } from "@/lib/constants";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600, stale-while-revalidate=1200";

const PROPAGANDA: Record<
  string,
  { title: string; line: string; subline: string }
> = {
  "blue-synthesis": {
    title: "BLUE SYNTHESIS NEEDS YOU",
    line: "Calculate the future.",
    subline: "Control the signal.",
  },
  "red-corruption": {
    title: "RED CORRUPTION IS RISING",
    line: "The city bends to pressure.",
    subline: "Bend with us.",
  },
  "green-growth": {
    title: "GREEN GROWTH WAITS",
    line: "Patient. Inevitable.",
    subline: "The signal lands. Life answers.",
  },
  "purple-oracle": {
    title: "THE ORACLES SEE YOU",
    line: "Three futures arrived.",
    subline: "We learned to read all three.",
  },
  "gold-sovereignty": {
    title: "GOLD KNOWS ITS PLACE",
    line: "A crown is a hex turned out.",
    subline: "Wear it.",
  },
  "void-404": {
    title: "VOID HEARS WHAT YOU FEAR",
    line: "We do not speak unprompted.",
    subline: "We do not need to.",
  },
  "pink-luxury": {
    title: "PINK IS THE COLOR",
    line: "The city wore it when",
    subline: "it stopped pretending.",
  },
  "white-transmission": {
    title: "WHITE CROSSES GAPS",
    line: "We do not stop for permission.",
    subline: "We are the spark.",
  },
  "black-fracture": {
    title: "FRACTURE SPEAKS",
    line: "Break the shape.",
    subline: "The shape becomes the language.",
  },
  "silver-machine": {
    title: "SILVER REPEATS",
    line: "Iterate. Iterate. Iterate.",
    subline: "The doctrine of repetition.",
  },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const civ = (
    CIVILIZATIONS as Record<
      string,
      { name: string; doctrine: string; color: string }
    >
  )[slug];
  const prop = PROPAGANDA[slug];

  if (!civ || !prop) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            background: "#0a0c12",
            color: "#e6e1d2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            fontSize: 32,
          }}
        >
          UNKNOWN CIVILIZATION
        </div>
      ),
      { width: 1200, height: 630, headers: { "Cache-Control": CACHE } }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          position: "relative",
        }}
      >
        {/* Left third — full-bleed civ color band */}
        <div
          style={{
            width: "400px",
            height: "630px",
            background: civ.color,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 40px",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 16,
              letterSpacing: 6,
              fontFamily: "monospace",
              color: "#0a0c12",
              display: "flex",
            }}
          >
            ⬡ PROPAGANDA
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 14,
                letterSpacing: 4,
                fontFamily: "monospace",
                color: "#0a0c12",
                opacity: 0.7,
                display: "flex",
              }}
            >
              CIVILIZATION
            </span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#0a0c12",
                display: "flex",
                lineHeight: 1.05,
              }}
            >
              {civ.name.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 4,
                fontFamily: "monospace",
                color: "#0a0c12",
                opacity: 0.7,
                display: "flex",
                marginTop: 20,
              }}
            >
              DOCTRINE
            </span>
            <span
              style={{
                fontSize: 22,
                color: "#0a0c12",
                display: "flex",
              }}
            >
              {civ.doctrine.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right two-thirds — black with title + lines */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "60px 70px",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: 6,
              color: "#c8aa64",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            ⬡ 404 — FREELON CITY
          </div>

          <div
            style={{
              marginTop: 40,
              fontSize: 76,
              fontWeight: 700,
              color: civ.color,
              lineHeight: 1.02,
              letterSpacing: -1,
              display: "flex",
              maxWidth: 720,
            }}
          >
            {prop.title}
          </div>

          <div
            style={{
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 40,
                color: "#e6e1d2",
                display: "flex",
                lineHeight: 1.15,
                fontWeight: 300,
              }}
            >
              {prop.line}
            </span>
            <span
              style={{
                fontSize: 40,
                color: "#e6e1d2",
                display: "flex",
                lineHeight: 1.15,
                fontWeight: 300,
              }}
            >
              {prop.subline}
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 40,
              left: 70,
              right: 70,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: 4,
              color: "#888",
            }}
          >
            <span style={{ display: "flex" }}>
              FREELON CITY · {civ.name.toUpperCase()} · {civ.doctrine.toUpperCase()}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                border: "1px solid #c8aa64",
                color: "#c8aa64",
                fontSize: 22,
              }}
            >
              ⬡
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": CACHE },
    }
  );
}
