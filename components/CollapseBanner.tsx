/**
 * <CollapseBanner /> — sticky in-canon status indicator.
 *
 * Renders nothing when the city is healthy. When collapse mode is
 * active, renders a quiet but visible amber/red banner explaining
 * the modified rates. Reframes the friction as LORE ("the grid is
 * dimming, defenders needed"), not as a punishment notice.
 *
 * Server component — reads getCollapseState() once per render
 * (the lib has its own 60s cache so repeated calls are cheap).
 */
import { getCollapseState } from "@/lib/collapse-mode";

export async function CollapseBanner() {
  // Layout-level component — never throw, never block render.
  let state;
  try { state = await getCollapseState(); } catch { return null; }
  if (!state.active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "linear-gradient(90deg, rgba(255,90,77,0.18), rgba(232,178,71,0.16))",
        borderBottom: "1px solid rgba(255,90,77,0.45)",
        padding: "10px var(--pad)",
        fontFamily: "var(--mono2)",
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "#FFD0C0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "#FF8A6E", fontWeight: 700 }}>⚠ CITY STATUS · COLLAPSE</span>
      <span>EARNING −{Math.round((1 - state.earnMultiplier) * 100)}%</span>
      <span>BURNS −{Math.round((1 - state.sinkMultiplier) * 100)}%</span>
      <span>DUMP BURN ×{state.dumpBurnMultiplier}</span>
      <span>RESCUE BOUNTY ×{state.rescueBountyMultiplier}</span>
      <span style={{ color: "#FFE3CC" }}>· defenders, hold the line ·</span>
    </div>
  );
}
