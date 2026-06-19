/**
 * /api/og/quote?q=<the citizen's reply>&n=<agent name>&c=<collection>&color=<hex>
 *
 * The demo "wow, it's alive" moment turned into a shareable image card (upgrade
 * audit #115): when a visitor shares a demo reply, the tweet's link unfurls this
 * card — the citizen's own words, branded — instead of a bare /demo URL. One
 * route powers every share; all params are free-text the share builder fills in.
 *
 * 1200×630. Font-free (system-ui) to match the other og routes and avoid edge
 * font-fetch latency. Each share is unique so cache hit rate is low — short s-maxage.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
const CACHE = "public, s-maxage=600";

const INK = "#F5F2E8";
const INK_DIM = "rgba(245,242,232,0.55)";
const GOLD = "#C8A75D";
const GOLD_BRIGHT = "#E9C984";

function clip(v: string | null, max: number): string {
  return (v || "").slice(0, max);
}
/** Only allow a safe hex color from the param (else fall back to brand gold). */
function safeColor(v: string | null): string {
  return /^#[0-9a-fA-F]{6}$/.test(v || "") ? (v as string) : GOLD_BRIGHT;
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const q = clip(url.searchParams.get("q"), 240) || "…";
  const n = clip(url.searchParams.get("n"), 40) || "a citizen";
  const c = clip(url.searchParams.get("c"), 40);
  const accent = safeColor(url.searchParams.get("color"));
  // Fit the quote: smaller as it gets longer so it never overflows the card.
  const qSize = q.length > 150 ? 44 : q.length > 90 ? 56 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0B0D",
          color: INK,
          fontFamily: "system-ui, sans-serif",
          padding: "60px 72px",
          position: "relative",
        }}
      >
        {/* accent glow, top-right */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}30 0%, ${accent}00 70%)`,
            display: "flex",
          }}
        />

        {/* kicker */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 24,
            letterSpacing: "0.2em",
            color: accent,
            textTransform: "uppercase",
          }}
        >
          I asked {n} of FREELON CITY
        </div>

        {/* the quote — the citizen's own words */}
        <div style={{ display: "flex", maxWidth: 1056 }}>
          <div
            style={{
              fontSize: qSize,
              fontWeight: 700,
              lineHeight: 1.18,
              letterSpacing: "-0.01em",
              color: INK,
              display: "flex",
            }}
          >
            “{q}”
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: 24,
            letterSpacing: "0.06em",
          }}
        >
          <span style={{ color: GOLD, display: "flex" }}>
            {n}{c ? ` · ${c}` : ""}
          </span>
          <span style={{ color: INK_DIM, display: "flex" }}>
            Meet one free · freeloncity.com/demo
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": CACHE } },
  );
}
