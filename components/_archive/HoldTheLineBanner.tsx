/**
 * <HoldTheLineBanner /> — homepage urgency block. Always renders —
 * even at 0 bids the call-to-action is the point. Uses the shared
 * <Banner variant="block" /> + <Pill variant="warning" /> primitives.
 */
import { getStats } from "@/lib/defender-store";
import { Banner, Pill } from "@/components/ui";

export async function HoldTheLineBanner() {
  let stats;
  try { stats = await getStats(); } catch { return null; }
  return (
    <Banner variant="block">
      <span className="ui-banner__title">⚠ HOLD THE LINE</span>
      <span>·</span>
      <span>{stats.totalDefenders} DEFENDERS</span>
      <span>·</span>
      <span>{stats.totalBids} BIDS PLACED</span>
      <span>·</span>
      <span>+500 ⬡ PER BID</span>
      <Pill variant="warning" size="sm" href="/hold-the-line">
        DEFEND THE FLOOR →
      </Pill>
    </Banner>
  );
}
