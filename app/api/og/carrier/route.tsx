/**
 * /api/og/carrier — the unfurl image for a shared Carrier-of-the-Week link.
 *
 * Renders the current crowned FREELON (gold-on-dark laurel card). By default it
 * reads the live winner via getCurrentCarrier() so a posted link always shows
 * the right citizen; query params can override every field for previews/tests.
 *
 * Recognition only — NO ⬡ language, no prize/value framing on the card.
 *
 * 1200×630. nodejs runtime (it reads Upstash via getCurrentCarrier); the
 * citizen art is pulled by URL so no font/edge fetch is needed.
 */
import { ImageResponse } from "next/og";
import { getCurrentCarrier } from "@/lib/carrier-of-week";
import { imageUrl } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CACHE = "public, s-maxage=600";

const INK = "#F5F2E8";
const INK_DIM = "rgba(245,242,232,0.55)";
const GOLD = "#C8A75D";
const BG = "#0A0E27";

function clip(v: string | null, max: number): string {
  return (v || "").slice(0, max);
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Live winner unless overridden by query (for previews).
  const live = await getCurrentCarrier().catch(() => null);

  const tokenIdRaw = url.searchParams.get("id");
  const tokenId = tokenIdRaw ? parseInt(tokenIdRaw, 10) : live?.tokenId ?? null;
  const week = clip(url.searchParams.get("wk"), 12) || live?.weekKey || "";
  const name = clip(url.searchParams.get("name"), 40) || live?.name || (tokenId ? `Citizen #${String(tokenId).padStart(4, "0")}` : "—");
  const civName = clip(url.searchParams.get("civ"), 28) || live?.civName || "FREELON CITY";
  const civColor = clip(url.searchParams.get("color"), 9) || live?.civColor || GOLD;
  const level = url.searchParams.get("lvl") || (live ? String(live.level) : "");
  const className = clip(url.searchParams.get("cls"), 28) || live?.className || "";

  const id4 = tokenId ? String(tokenId).padStart(4, "0") : "----";
  const art = tokenId ? imageUrl(tokenId) : null;
  const title = name && !name.startsWith("FREELON CITY #") ? name : `Citizen #${id4}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: BG,
          color: INK,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* gold glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -160,
            width: 620,
            height: 620,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GOLD}30 0%, ${GOLD}00 70%)`,
            display: "flex",
          }}
        />

        {/* Left: citizen art in a gold frame */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 470,
            padding: "56px 0 56px 56px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 358,
              height: 358,
              borderRadius: 18,
              border: `3px solid ${GOLD}`,
              overflow: "hidden",
              boxShadow: `0 0 60px ${civColor}40`,
              background: "#05070f",
            }}
          >
            {art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art} width={358} height={358} style={{ objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>
        </div>

        {/* Right: copy */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "64px 72px 64px 24px",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 24,
              letterSpacing: "0.24em",
              color: GOLD,
              textTransform: "uppercase",
            }}
          >
            <span style={{ fontSize: 30 }}>⬡</span> CARRIER OF THE WEEK{week ? ` · ${week}` : ""}
          </div>

          <div
            style={{
              fontSize: title.length > 22 ? 52 : 64,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.02,
              color: INK,
              display: "flex",
              marginTop: 10,
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <span style={{ display: "flex", fontSize: 26, color: civColor, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {civName}
            </span>
            <span style={{ display: "flex", fontSize: 26, color: INK_DIM }}>· #{id4}</span>
          </div>

          {(level || className) && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 22,
                fontSize: 26,
                color: INK,
                alignItems: "center",
              }}
            >
              {level ? (
                <span style={{ display: "flex", padding: "8px 18px", border: `2px solid ${GOLD}`, borderRadius: 8, color: GOLD, fontWeight: 700, letterSpacing: "0.1em" }}>
                  LVL {level}
                </span>
              ) : null}
              {className ? (
                <span style={{ display: "flex", fontSize: 26, color: INK_DIM, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {className}
                </span>
              ) : null}
            </div>
          )}

          <div style={{ display: "flex", fontSize: 22, color: INK_DIM, marginTop: 26 }}>
            Crowned on merit · recognition only
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 28, fontSize: 22 }}>
            <span style={{ color: GOLD, display: "flex" }}>⬡ @4040hex</span>
            <span style={{ color: INK_DIM, display: "flex" }}>freeloncity.com/carrier-of-the-week</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": CACHE } },
  );
}
