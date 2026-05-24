/**
 * /api/og/sweep-burst?ids=1,2,3,4,5,6&total=12.5
 *
 * Composite 3×2 grid OG card emitted when a "sweep burst" fires
 * (5+ citizens sold inside a 4-hour pulse window). Used as the
 * media attached to the X autopost and also rendered live on /.
 *
 * Inputs (all query params):
 *   ids   — CSV of up to 6 token ids (1-4040). Shown in row-major order.
 *   total — optional total ETH volume of the burst, formatted as "X.X" or "X.XX".
 *   count — optional total citizen count (may be > 6 if the burst was bigger
 *           than what fits in the grid).
 *
 * 1200×630, edge-cacheable for 10 min — but in practice each burst
 * has unique params so the cache hit rate is low. Acceptable cost.
 *
 * Layout:
 *   ┌────────────────────────────────┐
 *   │ kicker  ⬡ SWEEP BURST · LIVE   │
 *   │ N CITIZENS SWEPT · X.X Ξ       │  (huge display number)
 *   │ ┌──┬──┬──┐                     │
 *   │ │  │  │  │  3×2 image grid    │
 *   │ ├──┼──┼──┤                     │
 *   │ │  │  │  │                     │
 *   │ └──┴──┴──┘                     │
 *   │            ⬡ 4040hex · the city remembers
 *   └────────────────────────────────┘
 */
import { ImageResponse } from "next/og";
import { IPFS_GATEWAY, IMAGE_CID } from "@/lib/constants";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600";

const GOLD = "#C8A75D";
const INK = "#F5F2E8";
const INK_DIM = "rgba(245,242,232,0.55)";
const BG = "#050505";
const PANEL = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.18)";

function citizenImageUrl(id: number): string {
  return `${IPFS_GATEWAY}/${IMAGE_CID}/${id.toString().padStart(4, "0")}.jpg`;
}

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  const out: number[] = [];
  for (const piece of raw.split(",")) {
    const n = Number(piece.trim());
    if (Number.isFinite(n) && n >= 1 && n <= 4040 && Number.isInteger(n)) {
      out.push(n);
    }
    if (out.length >= 6) break;
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = parseIds(searchParams.get("ids"));
  const total = searchParams.get("total"); // e.g. "12.50"
  const countRaw = searchParams.get("count");
  // Display count: explicit ?count= wins over ids.length so the headline
  // can read "12 CITIZENS SWEPT" even when we only have room for 6 images.
  const count = countRaw && Number.isFinite(Number(countRaw))
    ? Math.max(ids.length, Math.floor(Number(countRaw)))
    : ids.length;

  if (ids.length === 0) {
    return new Response("Missing or invalid ids param", { status: 400 });
  }

  // Pad to exactly 6 cells. Empty cells render as dark hex placeholders so
  // the layout doesn't collapse if the burst happened to be exactly 5.
  const cells: Array<number | null> = [...ids];
  while (cells.length < 6) cells.push(null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: BG,
          color: INK,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          position: "relative",
        }}
      >
        {/* Top: kicker + headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span
            style={{
              fontSize: 16,
              letterSpacing: 6,
              color: GOLD,
              fontFamily: "monospace",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            ⬡ SWEEP BURST · LIVE FROM THE CITY
          </span>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1,
              letterSpacing: -2,
              fontWeight: 400,
              color: INK,
              display: "flex",
              alignItems: "baseline",
              gap: 18,
            }}
          >
            <span style={{ color: GOLD }}>{count}</span>
            <span>CITIZENS SWEPT</span>
            {total && (
              <span style={{ fontSize: 38, color: INK_DIM, letterSpacing: 0 }}>
                · {total} Ξ
              </span>
            )}
          </div>
        </div>

        {/* Middle: 3×2 image grid */}
        <div
          style={{
            marginTop: 28,
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: 12,
            // Edge runtime ImageResponse doesn't support real CSS grid in all
            // cases — but next/og supports it in nodejs runtime which we use.
          }}
        >
          {cells.map((id, i) => (
            <div
              key={i}
              style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {id !== null ? (
                // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                <img
                  src={citizenImageUrl(id)}
                  width={356}
                  height={205}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 18,
                    letterSpacing: 4,
                    color: INK_DIM,
                    fontFamily: "monospace",
                  }}
                >
                  ⬡
                </span>
              )}
              {id !== null && (
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    top: 8,
                    padding: "3px 8px",
                    background: "rgba(0,0,0,0.55)",
                    color: GOLD,
                    fontSize: 14,
                    letterSpacing: 2,
                    fontFamily: "monospace",
                    borderRadius: 4,
                    fontWeight: 700,
                  }}
                >
                  #{String(id).padStart(4, "0")}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: "monospace",
          }}
        >
          <span style={{ color: GOLD, fontSize: 18, letterSpacing: 4 }}>
            ⬡ @4040hex
          </span>
          <span style={{ color: INK_DIM, fontSize: 16, letterSpacing: 3 }}>
            THE CITY REMEMBERS WHAT MOVES THROUGH IT
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
