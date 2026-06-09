import { ImageResponse } from "next/og";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getProgress, getRankByLevel } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { getAgentHistory } from "@/lib/agent-history";

// nodejs (not edge): reads progression + agent-history stores (Redis).
export const runtime = "nodejs";

/**
 * CITIZEN RÉSUMÉ CARD — the weekly "look what my citizen has become" status flex
 * (City Creation MVP, piece #3, the cheapest/highest-flex-per-effort surface:
 * pure OG render from data that ALREADY exists, no generation cost, no new HEX
 * faucet). Mirrors /api/og/agent/[id]: portrait left, status right. Restrained
 * dark + civ-accent signature look (the official-archive lane — see
 * POSTER_LOOK_BANK.md A1). Public proof only — no raw work body (per
 * HISTORY_VISIBILITY_POLICY): records COUNT, not contents.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return new Response("Not found", { status: 404 });

  const color = civilizationColor(c.civilization);
  const civ = (CIVILIZATIONS as Record<string, { name: string }>)[c.civilization];
  const id4 = tid.toString().padStart(4, "0");
  const name = c.transmission_name || c.honoree || `Citizen #${id4}`;

  const [progress, rank, history] = await Promise.all([
    getProgress(tid).catch(() => null),
    getRankByLevel(tid).catch(() => null),
    getAgentHistory(tid).catch(() => []),
  ]);
  const spec = progress ? deriveSpec(progress) : null;
  const level = progress?.level ?? 1;
  const className = spec && spec.cls !== "drifter" ? spec.className : "Untrained";
  const records = history.length;
  const rankText = typeof rank === "number" ? `#${rank}` : "—";

  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 3, color: "#6a6658" }}>
        {label}
      </span>
      <span style={{ fontSize: 40, fontWeight: 800, color: "#e6e1d2", lineHeight: 1 }}>{value}</span>
    </div>
  );

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
        }}
      >
        {/* Left: portrait */}
        <div style={{ width: "440px", height: "630px", background: "#000", display: "flex", borderRight: `3px solid ${color}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(tid)} alt={name} width={440} height={630} style={{ objectFit: "cover" }} />
        </div>

        {/* Right: the résumé */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 52px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 4, color }}>
              CITY ARCHIVE · RÉSUMÉ · #{id4}
            </span>
            <span style={{ fontSize: 50, fontWeight: 800, marginTop: 16, lineHeight: 1.05 }}>{name}</span>
            <span style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 2, color, marginTop: 10 }}>
              LV {level} · {className.toUpperCase()}
            </span>
          </div>

          {/* Stat row — proof of work (counts, not contents) */}
          <div style={{ display: "flex", gap: 56, marginTop: 8 }}>
            {stat("RECORDS LOGGED", String(records))}
            {stat("RANK", rankText)}
            {stat("CLASS", className)}
          </div>

          <span style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 2, color: "#6a6658" }}>
            {civ?.name?.toUpperCase()} · freeloncity.com
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
