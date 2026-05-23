import { ImageResponse } from "next/og";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { CIVILIZATIONS, LOCAL_HEROES, imageUrl, CONTRACT } from "@/lib/constants";

export const runtime = "edge";

async function getLastSale(tokenId: number): Promise<number | null> {
  if (!process.env.OPENSEA_API_KEY) return null;
  try {
    const url = `https://api.opensea.io/api/v2/events/chain/ethereum/contract/${CONTRACT}/nfts/${tokenId}?event_type=sale&limit=1`;
    const r = await fetch(url, {
      headers: { "X-API-KEY": process.env.OPENSEA_API_KEY },
      next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const event = d.asset_events?.[0];
    if (!event) return null;
    const { paymentToEth } = await import("@/lib/eth-math");
    return paymentToEth(event.payment);
  } catch { return null; }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return new Response("Not found", { status: 404 });

  const id4 = tid.toString().padStart(4, "0");
  const color = civilizationColor(c.civilization);
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string }>)[c.civilization];
  const displayName = c.transmission_name || c.honoree || `Citizen #${id4}`;

  const imgSrc = LOCAL_HEROES.has(tid)
    ? new URL(`/heroes/${id4}.webp`, req.url).toString()
    : imageUrl(tid);

  const lastSale = await getLastSale(tid);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Left: hex-clipped citizen */}
        <div
          style={{
            width: "580px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0d0f15",
            borderRight: `4px solid ${color}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            width="500"
            height="500"
            alt=""
            style={{
              width: "500px",
              height: "500px",
              objectFit: "cover",
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          />
        </div>

        {/* Right: stats */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 56px",
          }}
        >
          {/* Top: label + name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontSize: 16,
                letterSpacing: "0.32em",
                color: "#c8aa64",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {`LISTING CARD · #${id4}`}
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "#e6e1d2",
                textTransform: "uppercase",
                marginTop: 8,
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: 18,
                letterSpacing: "0.18em",
                color,
                textTransform: "uppercase",
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              {`${civ?.name ?? c.civilization} · ${c.tier.toUpperCase()}`}
            </div>
          </div>

          {/* Middle: trait stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 18 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#888", letterSpacing: "0.18em", fontSize: 13, width: 100, textTransform: "uppercase" }}>Shape</span>
              <span style={{ color: "#e6e1d2", fontWeight: 600 }}>{c.shape}</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#888", letterSpacing: "0.18em", fontSize: 13, width: 100, textTransform: "uppercase" }}>Hex State</span>
              <span style={{ color: "#e6e1d2", fontWeight: 600 }}>{c.hex_state}</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#888", letterSpacing: "0.18em", fontSize: 13, width: 100, textTransform: "uppercase" }}>Caste</span>
              <span style={{ color: "#e6e1d2", fontWeight: 600 }}>{c.caste}</span>
            </div>
          </div>

          {/* Bottom: last sale + url */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lastSale !== null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 18,
                  padding: "16px 0",
                  borderTop: "1px solid #1f2027",
                  borderBottom: "1px solid #1f2027",
                }}
              >
                <span style={{ color: "#888", letterSpacing: "0.24em", fontSize: 13, textTransform: "uppercase" }}>Last sale</span>
                <span style={{ color: "#c8aa64", fontSize: 36, fontWeight: 800, letterSpacing: "-0.01em" }}>
                  {`${lastSale.toFixed(4)} ETH`}
                </span>
              </div>
            )}
            <div
              style={{
                fontSize: 16,
                letterSpacing: "0.22em",
                color: "#888",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              {`freeloncity.com/citizens/${tid}/card`}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=31536000, immutable, s-maxage=31536000" } },
  );
}
