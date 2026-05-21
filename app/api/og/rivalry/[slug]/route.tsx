import { ImageResponse } from "next/og";
import { CIVILIZATIONS } from "@/lib/constants";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600, stale-while-revalidate=1200";

type CivDef = {
  name: string;
  doctrine: string;
  color: string;
  rival?: string;
  rivalLine?: string;
};

function headlineFor(action: string): string {
  switch (action) {
    case "overtake":
      return "HAS OVERTAKEN";
    case "attack":
      return "IS ATTACKING";
    case "challenge":
    default:
      return "IS CHALLENGING";
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "challenge";
  const headline = headlineFor(action);

  const civs = CIVILIZATIONS as Record<string, CivDef>;
  const civ = civs[slug];

  if (!civ || !civ.rival || !civs[civ.rival]) {
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
          NO RIVAL
        </div>
      ),
      { width: 1200, height: 630, headers: { "Cache-Control": CACHE } }
    );
  }

  const rival = civs[civ.rival];
  const line = civ.rivalLine || "";

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
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Top header bar */}
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: 6,
            color: "#c8aa64",
            zIndex: 5,
          }}
        >
          <span style={{ display: "flex" }}>⬡ 404 — FREELON CITY</span>
          <span style={{ display: "flex" }}>CIVILIZATION WAR</span>
        </div>

        {/* Two halves */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "430px",
            marginTop: 80,
          }}
        >
          {/* LEFT — your civ */}
          <div
            style={{
              flex: 1,
              background: civ.color,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: "40px 60px",
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
              ATTACKER
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#0a0c12",
                lineHeight: 1,
                marginTop: 10,
                display: "flex",
                maxWidth: 460,
              }}
            >
              {civ.name.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 18,
                color: "#0a0c12",
                opacity: 0.8,
                marginTop: 12,
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              {civ.doctrine.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#0a0c12",
                marginTop: 28,
                letterSpacing: 4,
                display: "flex",
              }}
            >
              {headline}
            </span>
          </div>

          {/* VS divider */}
          <div
            style={{
              width: 120,
              background: "#0a0c12",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: "1px solid #1a1d26",
              borderRight: "1px solid #1a1d26",
            }}
          >
            <span
              style={{
                fontSize: 22,
                letterSpacing: 6,
                fontFamily: "monospace",
                color: "#c8aa64",
                display: "flex",
              }}
            >
              VS
            </span>
            <span
              style={{
                fontSize: 64,
                color: "#c8aa64",
                marginTop: 12,
                display: "flex",
              }}
            >
              ⬡
            </span>
          </div>

          {/* RIGHT — rival civ */}
          <div
            style={{
              flex: 1,
              background: rival.color,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-end",
              padding: "40px 60px",
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
              RIVAL
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#0a0c12",
                lineHeight: 1,
                marginTop: 10,
                display: "flex",
                maxWidth: 460,
                textAlign: "right",
              }}
            >
              {rival.name.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 18,
                color: "#0a0c12",
                opacity: 0.8,
                marginTop: 12,
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              {rival.doctrine.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bottom — rivalry line */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "20px 80px",
          }}
        >
          <span
            style={{
              fontSize: 28,
              color: "#e6e1d2",
              fontStyle: "italic",
              fontWeight: 300,
              lineHeight: 1.25,
              display: "flex",
              maxWidth: 1040,
            }}
          >
            &ldquo;{line}&rdquo;
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com</span>
          <span style={{ display: "flex", color: "#c8aa64" }}>
            CIVILIZATION WAR
          </span>
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
