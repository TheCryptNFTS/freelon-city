import { ImageResponse } from "next/og";
import { isValidAddress } from "@/lib/wallet-tokens";
import { TOTAL } from "@/lib/constants";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600";

type LeaderboardEntry = {
  address: string;
  balance: number;
  lifetimeEarned: number;
  claimStreak: number;
};

type LeaderboardResponse = {
  sort: string;
  total: number;
  top: LeaderboardEntry[];
};

async function fetchLeaderboard(
  origin: string,
): Promise<LeaderboardResponse | null> {
  try {
    const r = await fetch(
      `${origin}/api/leaderboard?sort=balance&limit=100`,
      { next: { revalidate: 300 } },
    );
    if (!r.ok) return null;
    return (await r.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return new Response("Invalid address", { status: 400 });
  }
  const origin = new URL(req.url).origin;
  const lb = await fetchLeaderboard(origin);

  const target = address.toLowerCase();
  let rank: number | null = null;
  let balance: number | null = null;
  if (lb?.top) {
    const idx = lb.top.findIndex((e) => e.address.toLowerCase() === target);
    if (idx >= 0) {
      rank = idx + 1;
      balance = lb.top[idx].balance;
    }
  }

  const rankLabel = rank !== null ? `#${rank}` : "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#050505",
          color: "#F5F2E8",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 6,
            color: "#C8A75D",
            fontFamily: "monospace",
            display: "flex",
          }}
        >
          ⬡ FREELON CITY · LEADERBOARD RANK
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: 22,
              color: "#888",
              letterSpacing: 4,
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            RANK
          </span>
          <span
            style={{
              fontSize: 200,
              fontWeight: 500,
              color: "#C8A75D",
              display: "flex",
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            {rankLabel}
          </span>
          <span
            style={{
              fontSize: 26,
              color: "#F5F2E8",
              letterSpacing: 6,
              fontFamily: "monospace",
              display: "flex",
              marginTop: 8,
            }}
          >
            OF {TOTAL} CARRIERS
          </span>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 60,
            paddingTop: 28,
            borderTop: "1px solid #1a1d26",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              ADDRESS
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#F5F2E8",
                fontFamily: "monospace",
                display: "flex",
                marginTop: 4,
              }}
            >
              {shortAddr(address)}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              BALANCE
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#C8A75D",
                display: "flex",
                marginTop: 4,
              }}
            >
              {balance !== null ? `${balance.toLocaleString()} ⬡` : "—"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
            marginTop: 22,
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com/leaderboard</span>
          <span style={{ display: "flex", color: "#C8A75D" }}>
            WE HEAR · WE SYNC · WE ARE
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
