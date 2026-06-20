/**
 * <CollapseBanner /> — sticky in-canon status indicator. Renders
 * nothing when the city is healthy. When collapse mode is active it
 * uses the shared <Banner /> primitive (top variant) so the styling
 * matches HoldTheLineBanner and any future urgency strip.
 */
import { getCollapseState } from "@/lib/collapse-mode";
import { Banner } from "@/components/ui";

export async function CollapseBanner() {
  let state;
  try { state = await getCollapseState(); } catch { return null; }
  if (!state.active) return null;

  return (
    <Banner variant="top">
      <span className="ui-banner__title">⚠ CITY STATUS · COLLAPSE</span>
      <span>EARNING −{Math.round((1 - state.earnMultiplier) * 100)}%</span>
      <span>BURNS −{Math.round((1 - state.sinkMultiplier) * 100)}%</span>
      <span className="ui-banner__accent">· the grid trembles ·</span>
    </Banner>
  );
}
