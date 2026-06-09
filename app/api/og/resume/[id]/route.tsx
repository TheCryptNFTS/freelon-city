import { ImageResponse } from "next/og";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getProgress, getRankByLevel } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { getAgentHistory } from "@/lib/agent-history";

// nodejs (not edge): reads progression + agent-history stores (Redis).
export const runtime = "nodejs";

/**
 * CITIZEN RÉSUMÉ CARD — "Cinematic Poster Record" (RESUME_CARD_REDESIGN.md, Direction C).
 *
 * A social FLEX OBJECT, not a web component. v1 was a left-image/right-stats dashboard
 * panel (rejected: clean but no desire-to-post). This is cinematic key-art: full-bleed
 * portrait + a bottom gradient scrim + a HUGE title + status STAMP-CHIPS — the 1-second
 * scroll-stopper. Built from data that already exists (no generation cost, no HEX faucet),
 * public-proof only (records COUNT, not contents — per HISTORY_VISIBILITY_POLICY).
 *
 * Satori note: no special-glyph fonts → the hex mark is drawn as inline <svg>, never a
 * text glyph (v1 hit ⬡ tofu). Text-over-image via absolute positioning + a scrim for
 * legibility (the v1 mistake was splitting image and text into two dead zones).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return new Response("Not found", { status: 404 });

  const color = civilizationColor(c.civilization);
  const civ = (CIVILIZATIONS as Record<string, { name: string }>)[c.civilization];
  const id4 = tid.toString().padStart(4, "0");

  const [progress, rank, history] = await Promise.all([
    getProgress(tid).catch(() => null),
    getRankByLevel(tid).catch(() => null),
    getAgentHistory(tid).catch(() => []),
  ]);
  const spec = progress ? deriveSpec(progress) : null;
  const className = (spec && spec.cls !== "drifter" ? spec.className : "Citizen").toUpperCase();
  const records = history.length;
  const rankText = typeof rank === "number" ? `#${rank}` : "UNRANKED";
  const civName = (civ?.name ?? c.civilization).toUpperCase();

  // Archive STAMP — a small caps label over a big value, civ-accent left edge,
  // faint fill + thin border. Reads as an official stamped field, not an HTML button.
  const stamp = (label: string, value: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        minHeight: 70,
        padding: "10px 22px 10px 18px",
        borderLeft: `4px solid ${color}`,
        border: "1px solid rgba(245,242,232,0.2)",
        borderLeftWidth: 4,
        background: "rgba(10,12,18,0.78)",
      }}
    >
      <span style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: 3, color: "rgba(243,239,228,0.5)" }}>
        {label}
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, letterSpacing: 1, color: "#f3efe4" }}>
        {value}
      </span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "1200px", height: "630px", display: "flex", position: "relative", background: "#0a0c12" }}>
        {/* Full-bleed portrait (cinematic, fills the frame) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(tid)}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "630px", objectFit: "cover" }}
        />

        {/* Civ-accent vignette frame */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "630px", border: `2px solid ${color}`, boxShadow: `inset 0 0 180px 40px rgba(10,12,18,0.85)` }} />

        {/* Bottom gradient scrim — deeper so the title zone has clean breathing room */}
        <div style={{ position: "absolute", left: 0, bottom: 0, width: "1200px", height: "470px", background: "linear-gradient(180deg, rgba(10,12,18,0) 0%, rgba(10,12,18,0.65) 42%, rgba(10,12,18,0.98) 100%)", display: "flex" }} />

        {/* Large faint ARCHIVE SEAL watermark (one strong official object, not clutter) */}
        <div style={{ position: "absolute", top: 150, right: 60, display: "flex", alignItems: "center", justifyContent: "center", width: 220, height: 220, opacity: 0.16 }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="106" fill="none" stroke={color} strokeWidth="2" />
            <circle cx="110" cy="110" r="86" fill="none" stroke={color} strokeWidth="1" />
            <polygon points="110,34 176,72 176,148 110,186 44,148 44,72" fill="none" stroke={color} strokeWidth="2" />
          </svg>
        </div>
        <div style={{ position: "absolute", top: 248, right: 95, display: "flex", fontFamily: "monospace", fontSize: 16, letterSpacing: 5, color, opacity: 0.55, transform: "rotate(-8deg)" }}>
          ARCHIVE SEALED
        </div>

        {/* Top-left record stamp (hex drawn as SVG — no tofu) */}
        <div style={{ position: "absolute", top: 40, left: 44, display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="22" height="24" viewBox="0 0 22 24" style={{ display: "block" }}>
            <polygon points="11,1 21,6.5 21,17.5 11,23 1,17.5 1,6.5" fill="none" stroke={color} strokeWidth="2" />
          </svg>
          <span style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 6, color: "rgba(243,239,228,0.9)" }}>
            FREELON CITY ARCHIVE
          </span>
        </div>
        {/* Top-right serial — official record code */}
        <div style={{ position: "absolute", top: 44, right: 46, display: "flex", fontFamily: "monospace", fontSize: 19, letterSpacing: 4, fontWeight: 700, color: "rgba(243,239,228,0.78)" }}>
          FC-ARCHIVE-{id4}
        </div>

        {/* Bottom-left content block over the scrim */}
        <div style={{ position: "absolute", left: 48, bottom: 44, right: 48, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 92, fontWeight: 800, lineHeight: 0.95, color: "#f7f3e8", letterSpacing: -1 }}>
            CITIZEN #{id4}
          </span>
          <span style={{ marginTop: 12, fontFamily: "monospace", fontSize: 30, letterSpacing: 3, color, fontWeight: 700 }}>
            {civName} · {className}
          </span>
          <div style={{ display: "flex", gap: 16, marginTop: 26 }}>
            {stamp("RECORDS", `${records} SEALED`)}
            {stamp("STANDING", `RANK ${rankText}`)}
            {stamp("SIGNAL", "ACTIVE")}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
