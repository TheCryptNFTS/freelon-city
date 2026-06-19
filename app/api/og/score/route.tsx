/**
 * /api/og/score?g=sweep&n=12,400&nl=SIGNAL+SWEPT&sub=Best+streak+x7&tag=NEW+BEST
 *
 * Generic, game-themed score card used as the twitter:image when a player
 * shares an arcade result. One route powers every game — the `g` (game) param
 * picks the title + kicker + accent color; the rest are free-text display
 * fields the share builders fill in.
 *
 * Inputs (all query params, all optional except n):
 *   g   — game key: sweep | proof | cipher | reckoning | hex-match
 *   n   — the big headline value (e.g. "12,400" or "4/6"). REQUIRED.
 *   nl  — label under the big number (e.g. "SIGNAL SWEPT").
 *   sub — secondary line under the label (e.g. "Best streak ×7").
 *   tag — status chip top-right (e.g. "NEW BEST", "SIGNAL LOCKED").
 *
 * 1200×630. Font-free (system-ui) to match the other og routes and avoid
 * edge font-fetch latency. Each share has unique params so cache hit rate is
 * low — short s-maxage is fine.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
const CACHE = "public, s-maxage=600";

const INK = "#F5F2E8";
const INK_DIM = "rgba(245,242,232,0.55)";
const GOLD = "#C8A75D";

type Theme = { title: string; kicker: string; accent: string };

const THEMES: Record<string, Theme> = {
  sweep: { title: "SWEEP RUN", kicker: "CLEAR THE CORRUPTED", accent: "#E9C984" },
  proof: { title: "PROOF OF SIGNAL", kicker: "RECEIVE THE TRANSMISSION", accent: "#C8A75D" },
  cipher: { title: "THE CIPHER", kicker: "DECODE THE SHIFT", accent: "#9B6DFF" },
  reckoning: { title: "THE RECKONING", kicker: "CIV WAR · BURN FOR YOUR SIDE", accent: "#E0556B" },
  "hex-match": { title: "HEX MATCH", kicker: "LINE UP THE SIGNAL", accent: "#3DDC97" },
};

function clip(v: string | null, max: number): string {
  return (v || "").slice(0, max);
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const g = (url.searchParams.get("g") || "sweep").toLowerCase();
  const theme = THEMES[g] || THEMES.sweep;
  const n = clip(url.searchParams.get("n"), 24) || "—";
  const nl = clip(url.searchParams.get("nl"), 32);
  const sub = clip(url.searchParams.get("sub"), 60);
  const tag = clip(url.searchParams.get("tag"), 28);

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
          color: INK,
          fontFamily: "system-ui, sans-serif",
          padding: "64px 72px",
          position: "relative",
        }}
      >
        {/* accent glow, themed per game */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.accent}38 0%, ${theme.accent}00 70%)`,
            display: "flex",
          }}
        />

        {/* Top row: kicker + status tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 24,
              letterSpacing: "0.22em",
              color: theme.accent,
              textTransform: "uppercase",
            }}
          >
            <span style={{ fontSize: 30 }}>⬡</span> {theme.kicker}
          </div>
          {tag ? (
            <div
              style={{
                display: "flex",
                padding: "10px 20px",
                border: `2px solid ${theme.accent}`,
                borderRadius: 8,
                color: theme.accent,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {tag}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>

        {/* Middle: game title + big score */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: INK,
              display: "flex",
            }}
          >
            {theme.title}
          </div>
          <div
            style={{
              fontSize: 150,
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              color: theme.accent,
              display: "flex",
            }}
          >
            {n}
          </div>
          {nl ? (
            <div
              style={{
                fontSize: 30,
                letterSpacing: "0.18em",
                color: INK_DIM,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {nl}
            </div>
          ) : null}
          {sub ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 26,
                color: INK,
                display: "flex",
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: 24,
            letterSpacing: "0.06em",
          }}
        >
          <span style={{ color: GOLD, display: "flex" }}>⬡ @4040hex</span>
          <span style={{ color: INK_DIM, display: "flex" }}>
            404 · FREELON CITY · freeloncity.com/play
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": CACHE } },
  );
}
