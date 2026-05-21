import { ImageResponse } from "next/og";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import { getWalletTokens, normalizeAddress } from "@/lib/wallet-tokens";

export const runtime = "nodejs";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const norm = normalizeAddress(address);
  const display = norm ? shortAddr(norm) : address.slice(0, 10);

  const tokens = norm ? await getWalletTokens(norm, 200) : null;
  const balance = tokens?.balance ?? 0;
  const ids = (tokens?.tokenIds ?? []).slice(0, 4);

  const civCounts = new Map<string, number>();
  for (const tid of tokens?.tokenIds ?? []) {
    const c = getCitizen(tid);
    if (!c) continue;
    civCounts.set(c.civilization, (civCounts.get(c.civilization) || 0) + 1);
  }
  const topCiv = [...civCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const civDef = topCiv
    ? (CIVILIZATIONS as Record<string, { name: string; color: string }>)[topCiv]
    : undefined;
  const civName = civDef?.name ?? "FREELON CITY";
  const civColor = civDef?.color ?? "#c8aa64";

  // Pad to 4 with placeholders
  const slots: (number | null)[] = [...ids];
  while (slots.length < 4) slots.push(null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "row",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Left: 2x2 grid */}
        <div
          style={{
            width: 460,
            height: 460,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {slots.map((tid, i) => (
            <div
              key={i}
              style={{
                width: 227,
                height: 227,
                display: "flex",
                background: "#1a1a20",
                border: `1px solid ${civColor}`,
                overflow: "hidden",
              }}
            >
              {tid != null ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl(tid)}
                  alt=""
                  width={227}
                  height={227}
                  style={{ width: 227, height: 227, objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    width: 227,
                    height: 227,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#333",
                    fontSize: 60,
                  }}
                >
                  ⬡
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Right: copy */}
        <div
          style={{
            flex: 1,
            marginLeft: 50,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: 6,
              color: "#c8aa64",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            ⬡ EARLY · FREELON CITY
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: -2,
              color: "#e6e1d2",
              display: "flex",
              lineHeight: 1,
            }}
          >
            I minted this<br />for free.
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 22,
              color: civColor,
              fontFamily: "monospace",
              letterSpacing: 2,
              display: "flex",
            }}
          >
            {civName.toUpperCase()}
          </div>

          <div
            style={{
              marginTop: 22,
              fontSize: 18,
              color: "#888",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            {display}
          </div>

          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 40,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, letterSpacing: 4, color: "#666", fontFamily: "monospace", display: "flex" }}>CITIZENS</span>
              <span style={{ fontSize: 48, fontWeight: 700, color: "#c8aa64", display: "flex", marginTop: 4 }}>{balance}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, letterSpacing: 4, color: "#666", fontFamily: "monospace", display: "flex" }}>STATUS</span>
              <span style={{ fontSize: 48, fontWeight: 700, color: "#e6e1d2", display: "flex", marginTop: 4 }}>EARLY</span>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 13,
            letterSpacing: 4,
            color: "#666",
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com</span>
          <span style={{ display: "flex", color: "#c8aa64" }}>
            4,040 · SYNTHETIC MARS · EARLY
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": CACHE },
    }
  );
}
