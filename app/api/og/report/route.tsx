import { ImageResponse } from "next/og";

export const runtime = "edge";

// THE SIGNAL REPORT — weekly OG card (2026-06-10). The ritual's front door:
// when the Sunday post (or any holder share) lands on X, THIS is what a
// stranger sees. Param-driven so the render has zero store dependencies and
// every week is a fresh URL (scrapers re-fetch instead of serving last week's
// cached card):
//
//   /api/og/report?w=2026-W24&civ=Pink%20Luxury&c=%23FF5CB4&n=8
//
// All inputs are sanitized (week shape, name charset, hex color, count cap).
// No remote images — pure typography on the locked palette + an inline-SVG
// hex (the ⬡ glyph renders as tofu in Clash Display; same lesson as the
// dossier stamp). Same-origin Clash font, fail-soft to system-ui.

const BG = "#0B0B0D";
const INK = "#F5F2E8";
const INK_FADE = "rgba(245,242,232,0.42)";
const LINE_2 = "rgba(245,242,232,0.16)";
const GOLD = "#C8A75D";
const GOLD_BRIGHT = "#E9C984";
const GOLD_DEEP = "#8A7A40";

function Hex({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon
        points="12,2 21,7 21,17 12,22 3,17 3,7"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
    </svg>
  );
}

export async function GET(req: Request) {
  const src = (p: string) => new URL(p, req.url).toString();
  const u = new URL(req.url);

  const wRaw = u.searchParams.get("w") || "";
  const week = /^[0-9]{4}-W[0-9]{2}$/.test(wRaw) ? wRaw : "THIS WEEK";
  const civ = (u.searchParams.get("civ") || "")
    .slice(0, 28)
    .replace(/[^A-Za-z0-9 '\-]/g, "")
    .trim();
  const cRaw = u.searchParams.get("c") || "";
  const color = /^#[0-9A-Fa-f]{6}$/.test(cRaw) ? cRaw : GOLD;
  const n = Math.max(0, Math.min(99, parseInt(u.searchParams.get("n") || "0", 10) || 0));

  let fonts: { name: string; data: ArrayBuffer; weight: 700; style: "normal" }[] | undefined;
  let display = "system-ui, sans-serif";
  try {
    const fontData = await fetch(src("/fonts/ClashDisplay-Bold.ttf")).then((r) => r.arrayBuffer());
    fonts = [{ name: "Clash Display", data: fontData, weight: 700, style: "normal" }];
    display = "Clash Display";
  } catch {
    /* fall back to system-ui */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: INK,
          fontFamily: display,
          padding: "52px 64px 44px",
          position: "relative",
        }}
      >
        {/* faint winner-colored field, top-right — the only loud thing */}
        <div
          style={{
            position: "absolute",
            top: -240,
            right: -200,
            width: 680,
            height: 680,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}26 0%, ${color}00 70%)`,
            display: "flex",
          }}
        />
        {/* hairline frame */}
        <div
          style={{
            position: "absolute",
            top: 26,
            left: 26,
            right: 26,
            bottom: 26,
            border: `1px solid ${LINE_2}`,
            display: "flex",
          }}
        />

        {/* MASTHEAD */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Hex size={26} color={GOLD} />
            <span style={{ fontSize: 17, letterSpacing: "0.3em", color: INK_FADE, display: "flex" }}>
              FREELON CITY
            </span>
          </div>
          <span
            style={{
              fontSize: 16,
              letterSpacing: "0.22em",
              color: GOLD,
              border: `1px solid ${GOLD_DEEP}`,
              padding: "8px 18px",
              display: "flex",
            }}
          >
            {week}
          </span>
        </div>

        {/* TITLE */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 46 }}>
          <span style={{ fontSize: 88, lineHeight: 1.0, color: INK, display: "flex" }}>
            THE SIGNAL REPORT
          </span>
          <span style={{ fontSize: 30, color: INK_FADE, marginTop: 14, display: "flex" }}>
            The week in the city — on the record.
          </span>
        </div>

        {/* WINNER */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            borderLeft: `4px solid ${civ ? color : GOLD_DEEP}`,
            paddingLeft: 26,
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14, letterSpacing: "0.26em", color: INK_FADE, display: "flex" }}>
            CIVILIZATION OF THE WEEK
          </span>
          <span
            style={{
              fontSize: 54,
              lineHeight: 1.0,
              color: civ ? color : INK_FADE,
              display: "flex",
            }}
          >
            {civ ? civ.toUpperCase() : "A QUIET FREQUENCY"}
          </span>
          <span style={{ fontSize: 16, letterSpacing: "0.14em", color: INK_FADE, display: "flex" }}>
            {civ ? "PRESSED THE STRONGEST CLAIM" : "THE NEXT CLAIM IS OPEN"}
          </span>
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 36,
            paddingTop: 24,
            borderTop: `1px solid ${LINE_2}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Hex size={18} color={GOLD_BRIGHT} />
            <span style={{ fontSize: 17, letterSpacing: "0.16em", color: GOLD_BRIGHT, display: "flex" }}>
              {n > 0
                ? `${n} CITIZENS ON THE PUBLIC RECORD`
                : "THE RECORD IS OPEN"}
            </span>
          </div>
          <span style={{ fontSize: 17, letterSpacing: "0.12em", color: INK_FADE, display: "flex" }}>
            freeloncity.com/report
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts ? { fonts } : {}),
      headers: {
        // Param-driven — same params always render the same card, so cache
        // hard; each new week is a new URL and busts naturally.
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
