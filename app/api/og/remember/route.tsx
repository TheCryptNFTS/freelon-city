/**
 * /api/og/remember?f=<the visitor's own fact>
 *
 * The homepage "it remembered me" moment turned into a shareable image card.
 * When a visitor shares the MemoryProof beat, the tweet's link unfurls THIS card
 * — their OWN sentence, read back as a recalled memory, branded. The fact is the
 * whole hook: the card is about the reader, not the project. Built by
 * lib/share.ts tweetMemoryProof().
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

export function GET(req: Request) {
  const url = new URL(req.url);
  const f = clip(url.searchParams.get("f"), 80) || "…";
  // Fit the recalled line: smaller as it gets longer so it never overflows.
  const fSize = f.length > 60 ? 56 : f.length > 36 ? 68 : 80;

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
            background: `radial-gradient(circle, ${GOLD_BRIGHT}30 0%, ${GOLD_BRIGHT}00 70%)`,
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
            color: GOLD_BRIGHT,
            textTransform: "uppercase",
          }}
        >
          IT REMEMBERED ME
        </div>

        {/* the recalled line — the visitor's OWN words, read back */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1056 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.06em", color: INK_DIM }}>
            I told a FREELON one thing. I came back. It said:
          </div>
          <div
            style={{
              fontSize: fSize,
              fontWeight: 700,
              lineHeight: 1.16,
              letterSpacing: "-0.01em",
              color: INK,
              display: "flex",
            }}
          >
            “{f}.”
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
            FREELON CITY · it remembers you
          </span>
          <span style={{ color: INK_DIM, display: "flex" }}>
            Meet one free · freeloncity.com
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": CACHE } },
  );
}
