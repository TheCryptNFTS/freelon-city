import { ImageResponse } from "next/og";

export const runtime = "edge";

// Shareable OG card for GUARD THE POT. Two modes, driven by query params:
//   CRACKED → w=<winner mask>, r=<round>, p=<prize label>, a=<attempts>
//   STANDING → r=<round>, p=<prize label>, a=<attempts> (no winner)
// Font-free (system-ui) to avoid edge font-fetch latency, matching the other
// og routes. The cracked card is the "named public winner" spectacle: one
// FREELON, one prize, one winner — the thing a stranger reposts.
export function GET(req: Request) {
  const url = new URL(req.url);
  const winner = (url.searchParams.get("w") || "").slice(0, 24);
  const round = (url.searchParams.get("r") || "1").slice(0, 6);
  const prize = (url.searchParams.get("p") || "THE VAULT").slice(0, 40);
  const attempts = (url.searchParams.get("a") || "0").slice(0, 8);
  const cracked = !!winner;

  const gold = "#E9C984";
  const ink = "#F5F2E8";

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
          color: ink,
          fontFamily: "system-ui, sans-serif",
          padding: "72px",
          position: "relative",
        }}
      >
        {/* gold vault glow */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: cracked
              ? "radial-gradient(circle, rgba(233,201,132,0.30) 0%, rgba(233,201,132,0) 70%)"
              : "radial-gradient(circle, rgba(0,217,184,0.20) 0%, rgba(0,217,184,0) 70%)",
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
            color: gold,
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: 30 }}>⬡</span>{" "}
          {cracked ? `THE VAULT IS CRACKED · ROUND ${round}` : `GUARD THE POT · ROUND ${round}`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: cracked ? 108 : 116,
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: ink,
              display: "flex",
            }}
          >
            {cracked ? `${winner} cracked it.` : `${prize} behind one FREELON.`}
          </div>
          <div
            style={{
              fontSize: 34,
              color: gold,
              letterSpacing: "0.02em",
              display: "flex",
            }}
          >
            {cracked
              ? `Talked the guard out of ${prize} — after ${attempts} tried and failed.`
              : `${attempts} have tried to talk it out. It hasn't budged.`}
          </div>
        </div>

        <div
          style={{
            fontSize: 28,
            color: "#C8A75D",
            letterSpacing: "0.06em",
            display: "flex",
          }}
        >
          404 · FREELON CITY · freeloncity.com/play/guard
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
