import { ImageResponse } from "next/og";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getProgress } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { getAgentHistory } from "@/lib/agent-history";

// nodejs (not edge): this route reads the agent history store (Redis).
export const runtime = "nodejs";

/**
 * Social card for a citizen's agent output — the shareable "look what my agent
 * did" flex. Shows art, class+level, the ability used, and a clean snippet of
 * the most recent output (or ?work=N to pick one). Fail-soft: an untrained
 * citizen renders a generic "agent ready" card.
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

  const [progress, history] = await Promise.all([
    getProgress(tid).catch(() => null),
    getAgentHistory(tid).catch(() => []),
  ]);
  const spec = progress ? deriveSpec(progress) : null;
  const level = progress?.level ?? 1;
  const className = spec && spec.cls !== "drifter" ? spec.className.toUpperCase() : "UNTRAINED AGENT";

  const idx = Number(new URL(req.url).searchParams.get("work") ?? "0");
  const work = history[Number.isFinite(idx) && idx >= 0 ? idx : 0] ?? history[0];
  const abilityLabel = work?.abilityLabel ? work.abilityLabel.toUpperCase() : "";
  // HISTORY-PRIVACY (Prompt 10, 2026-06-09): this is a PUBLIC share image, so it
  // must not draw the raw text body (owner memory — see HISTORY_VISIBILITY_POLICY).
  // Use a safe proof summary instead: name the work type, never quote the output.
  // Image renders are shown as art elsewhere; text work gets a label, not content.
  const snippet =
    work && work.kind !== "image"
      ? `${work.task ? `${work.task} · ` : ""}content post`.toUpperCase()
      : "";

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
        {/* Left: art */}
        <div
          style={{
            width: "440px",
            height: "630px",
            background: "#000",
            display: "flex",
            borderRight: `3px solid ${color}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(tid)} alt={name} width={440} height={630} style={{ objectFit: "cover" }} />
        </div>

        {/* Right: the work */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 52px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 4, color }}>
              ⬡ FREELON CITY · #{id4}
            </span>
            <span style={{ fontSize: 52, fontWeight: 800, marginTop: 16, lineHeight: 1.05 }}>{name}</span>
            <span style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 2, color, marginTop: 10 }}>
              LV {level} · {className}
            </span>
          </div>

          {snippet ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
              {abilityLabel && (
                <span style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 3, color: "#9a9484" }}>
                  {abilityLabel}
                </span>
              )}
              <span style={{ fontSize: 30, lineHeight: 1.35, marginTop: 12, color: "#e6e1d2" }}>
                “{snippet}”
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 28, color: "#9a9484", marginTop: 8 }}>
              A trainable AI agent. Give it a job — it levels up and builds a work history.
            </span>
          )}

          <span style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 2, color: "#6a6658" }}>
            {civ?.name?.toUpperCase()} · freeloncity.com
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
