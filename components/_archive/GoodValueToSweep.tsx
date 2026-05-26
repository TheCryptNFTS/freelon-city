/**
 * <GoodValueToSweep /> — homepage panel that answers the Discord-asked
 * question (WitschiDaD 2026-05-25):
 *   "Is there better ones to sweep up or are they all equal?"
 *
 * Pulls the live "red signals" feed (listings ≤90% of floor) and
 * enriches each row with the citizen's computed VALUE + tier so a
 * newcomer can see at a glance which cheap listings are actually
 * underpriced vs the rarity score.
 *
 * Pure server component. Falls back to a still-useful "browse all"
 * card when the red-signals feed is empty.
 */
import Link from "next/link";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import {
  getCitizenStatsBatch,
  computeCitizenValue,
  acceptanceTier,
} from "@/lib/citizen-value-store";

type RedSignal = {
  tokenId: number;
  priceEth: number;
  bountyHex: number;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.freeloncity.com";

async function fetchRedSignals(): Promise<{ signals: RedSignal[]; floor: number }> {
  try {
    const r = await fetch(`${SITE}/api/market/red-signals`, { next: { revalidate: 120 } });
    if (!r.ok) return { signals: [], floor: 0 };
    const d = (await r.json()) as { signals?: RedSignal[]; floor?: number };
    return { signals: d.signals || [], floor: Number(d.floor || 0) };
  } catch {
    return { signals: [], floor: 0 };
  }
}

export async function GoodValueToSweep() {
  const { signals, floor } = await fetchRedSignals();

  if (signals.length === 0) {
    return (
      <section
        style={{
          maxWidth: "var(--maxw)",
          margin: "var(--s-5) auto",
          padding: "var(--s-4) var(--pad)",
        }}
      >
        <header style={{ marginBottom: "var(--s-2)" }}>
          <span className="kicker" style={{ color: "var(--gold)" }}>
            ⬡ GOOD VALUE · WHAT TO SWEEP NOW
          </span>
        </header>
        <div
          style={{
            padding: "var(--s-4) var(--s-5)",
            border: "1px dashed var(--line-2)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.6,
          }}
        >
          Nothing visibly underpriced right now. The floor is holding.
          <Link
            href="/citizens"
            style={{ color: "var(--gold)", marginLeft: 6 }}
          >
            Browse all 4,040 →
          </Link>
        </div>
      </section>
    );
  }

  // Enrich top-6 with value/tier
  const top = signals.slice(0, 6);
  const ids = top.map((s) => s.tokenId);
  const statsBatch = await getCitizenStatsBatch(ids).catch(() => new Map());
  const refFloor = floor > 0 ? floor : 0.003;

  return (
    <section
      style={{
        maxWidth: "var(--maxw)",
        margin: "var(--s-5) auto",
        padding: "var(--s-4) var(--pad)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: "var(--s-3)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ GOOD VALUE · WHAT TO SWEEP NOW
        </span>
        <span
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
          }}
        >
          UNDERPRICED LISTINGS · LIVE · {signals.length} FLAGGED
        </span>
      </header>

      <p
        style={{
          fontFamily: "var(--mono2)",
          fontSize: 12,
          color: "var(--ink-2)",
          lineHeight: 1.6,
          maxWidth: 720,
          marginBottom: "var(--s-3)",
        }}
      >
        Listings ≤90% of floor flagged by the city. Pick one with a
        high VALUE score — that's where rarity and accumulated hex
        outrun the asking price. Buy + hold 14 days → snipe bounty.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "var(--s-3)",
        }}
      >
        {top.map((s) => {
          const c = getCitizen(s.tokenId);
          const civ = c
            ? (CIVILIZATIONS as Record<string, { name: string; color: string }>)[c.civilization]
            : null;
          const color = civ?.color || "var(--gold)";
          const stats = statsBatch.get(s.tokenId) || { hex: 0, lastSaleEth: 0, lastSaleTs: 0, transferTs: 0 };
          const v = computeCitizenValue(s.tokenId, stats, refFloor);
          const tier = acceptanceTier(v.value);
          const id4 = String(s.tokenId).padStart(4, "0");
          return (
            <Link
              key={s.tokenId}
              href={`/citizens/${s.tokenId}`}
              style={{
                display: "block",
                padding: "var(--s-3)",
                borderRadius: 12,
                border: `1px solid ${color}55`,
                background: `linear-gradient(180deg, ${color}10 0%, rgba(0,0,0,0.4) 100%)`,
                color: "inherit",
                textDecoration: "none",
                transition: "transform 120ms ease, border-color 120ms ease",
              }}
            >
              <div
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  border: `1px solid ${color}33`,
                  marginBottom: 10,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(s.tokenId)}
                  alt=""
                  loading="lazy"
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--display)", fontSize: 16, color: "var(--ink)", letterSpacing: "-0.005em" }}>
                  #{id4}
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono2)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color,
                    fontWeight: 700,
                  }}
                >
                  {tier.tier}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontFamily: "var(--mono2)",
                  fontSize: 11,
                  color: "var(--ink-2)",
                  letterSpacing: "0.06em",
                }}
              >
                <span style={{ color: "#FF8A6E" }}>● {s.priceEth.toFixed(4)} Ξ</span>
                <span style={{ color: "var(--gold)" }}>+{s.bountyHex}⬡</span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "var(--mono2)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: "var(--ink-dim)",
                  textTransform: "uppercase",
                }}
              >
                VALUE · <strong style={{ color: "var(--ink)" }}>{v.value}</strong>/1000
              </div>
            </Link>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "var(--s-3)",
          fontFamily: "var(--mono2)",
          fontSize: 11,
          color: "var(--ink-dim)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        ⬡ NEW HERE? <Link href="/start" style={{ color: "var(--gold)" }}>2-MIN GUIDE →</Link>
        {" · "}
        <Link href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>
          BROWSE ON OPENSEA ↗
        </Link>
      </div>
    </section>
  );
}
