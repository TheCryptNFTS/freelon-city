import styles from "@/components/Presence.module.css";

/**
 * LAST SIGNAL — the honest presence line ("LAST SIGNAL 3m" in Space Mono).
 *
 * HONEST STATE LAW: this renders ONLY from a real timestamp (e.g. the newest
 * agent-history entry). No timestamp → renders nothing — it self-hides rather
 * than inventing activity. The gold dot is static by default and pulses ONLY
 * when `live` is true (a real process running right now); on static pages
 * never pass `live`.
 *
 * Server-safe: no hooks, no client directive — renders in RSC pages (the
 * dossier is ISR/revalidate-3600, so units are deliberately coarse).
 */

function relativeSignal(timestamp: number): string {
  // Clock skew / future stamps clamp to "now" instead of going negative.
  const diff = Math.max(0, Date.now() - timestamp);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

export function LastSignal({
  timestamp,
  live = false,
  className,
}: {
  /** Epoch ms of the most recent REAL activity. Null/invalid → renders nothing. */
  timestamp: number | null | undefined;
  /** Pulse the dot — ONLY when a real process is live right now. */
  live?: boolean;
  className?: string;
}) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }
  return (
    <span
      className={[styles.lastSignal, live ? styles.live : "", className ?? ""].filter(Boolean).join(" ")}
      title={new Date(timestamp).toUTCString()}
    >
      <span className={styles.signalDot} aria-hidden />
      LAST SIGNAL {relativeSignal(timestamp)}
    </span>
  );
}
