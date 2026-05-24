/**
 * <HoldTheLineBanner /> — sticky urgency banner on the homepage.
 *
 * Server component. Pulls live defender stats so the count is real,
 * not vibes. Renders nothing if total bids is 0 AND collapse mode is
 * inactive — only shouts when there's a reason to shout.
 *
 * The visual mimics the existing CollapseBanner but stays separate so
 * collapse + defender call-to-action can co-exist when both apply.
 */
import Link from "next/link";
import { getStats } from "@/lib/defender-store";

export async function HoldTheLineBanner() {
  let stats;
  try { stats = await getStats(); } catch { return null; }
  // Always render — even at 0 bids the call-to-action is the point
  return (
    <section
      role="status"
      aria-live="polite"
      style={{
        margin: "var(--s-4) auto",
        maxWidth: "var(--maxw)",
        padding: "12px var(--pad)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        flexWrap: "wrap",
        background: "linear-gradient(90deg, rgba(255,90,77,0.18), rgba(232,178,71,0.16))",
        border: "1px solid rgba(255,90,77,0.45)",
        borderRadius: 12,
        fontFamily: "var(--mono2)",
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "#FFD0C0",
      }}
    >
      <span style={{ color: "#FF8A6E", fontWeight: 700 }}>⚠ HOLD THE LINE</span>
      <span>·</span>
      <span>{stats.totalDefenders} DEFENDERS</span>
      <span>·</span>
      <span>{stats.totalBids} BIDS PLACED</span>
      <span>·</span>
      <span>+500 ⬡ PER BID</span>
      <Link
        href="/hold-the-line"
        style={{
          marginLeft: 10,
          padding: "5px 14px",
          borderRadius: 999,
          border: "1px solid #FF8A6E",
          background: "rgba(255,138,110,0.16)",
          color: "#FFE3CC",
          fontWeight: 700,
          textDecoration: "none",
          letterSpacing: "0.24em",
        }}
      >
        DEFEND THE FLOOR →
      </Link>
    </section>
  );
}
