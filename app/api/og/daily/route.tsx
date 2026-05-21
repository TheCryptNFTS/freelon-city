import { ImageResponse } from "next/og";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=3600, stale-while-revalidate=7200";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const day = todayUTC();
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Top: brand + day stamp */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span
            style={{
              fontSize: 16,
              letterSpacing: "0.32em",
              color: "#c8aa64",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {`404 · FREELON CITY · DAILY TRANSMISSION`}
          </span>
          <span
            style={{
              fontSize: 14,
              letterSpacing: "0.28em",
              color: "#888",
              fontFamily: "monospace",
            }}
          >
            {`UTC ${day}`}
          </span>
        </div>

        {/* Center: big headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              color: "#e6e1d2",
              textTransform: "uppercase",
            }}
          >
            {`I claimed`}
          </div>
          <div
            style={{
              fontSize: 200,
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "-0.05em",
              color: "#c8aa64",
              textTransform: "uppercase",
            }}
          >
            {`+10 HEX`}
          </div>
          <div
            style={{
              fontSize: 32,
              letterSpacing: "0.04em",
              color: "#a8a59a",
              lineHeight: 1.2,
              maxWidth: 920,
            }}
          >
            {`The city pays anyone who carries the signal. Share to claim. Hold a citizen to compound.`}
          </div>
        </div>

        {/* Bottom: CTA + url */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: "1px solid #1f2027",
          }}
        >
          <span
            style={{
              fontSize: 22,
              letterSpacing: "0.18em",
              color: "#e6e1d2",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {`Join the signal →`}
          </span>
          <span
            style={{
              fontSize: 18,
              letterSpacing: "0.22em",
              color: "#888",
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            {`freeloncity.com/carrier`}
          </span>
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
