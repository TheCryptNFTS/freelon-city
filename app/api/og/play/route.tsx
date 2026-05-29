import { ImageResponse } from "next/og";

export const runtime = "edge";

// Shareable OG card for the /play arcade. Query params:
//   t = title (e.g. "Hex Match"), k = kicker (e.g. "ARCADE · NO WALLET")
// Kept font-free (system-ui) to avoid edge font-fetch latency, matching the
// other og routes in this app.
export function GET(req: Request) {
  const url = new URL(req.url);
  const title = (url.searchParams.get("t") || "FREELON CITY ARCADE").slice(0, 48);
  const kicker = (url.searchParams.get("k") || "PLAY THE SIGNAL").slice(0, 48);

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
          padding: "72px",
          position: "relative",
        }}
      >
        {/* faint hex glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,217,184,0.22) 0%, rgba(0,217,184,0) 70%)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            letterSpacing: "0.24em",
            color: "#00D9B8",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: 30 }}>⬡</span> {kicker}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: "#F5F2E8",
              display: "flex",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#C8A75D",
              letterSpacing: "0.06em",
              display: "flex",
            }}
          >
            404 · FREELON CITY · freeloncity.com/play
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
