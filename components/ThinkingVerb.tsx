import styles from "./ThinkingVerb.module.css";

/**
 * THINKING-state status verb — kit: .living-city/ai-presence.md
 *
 * The single shimmer locus for a chat surface while a request is genuinely in
 * flight: a lowercase Space Mono verb with one gold shimmer pass. Verbs rotate
 * DETERMINISTICALLY by message count (the seed) — never randomly — so the same
 * moment in a conversation always reads the same.
 *
 * HONEST STATE LAW: render this ONLY while the surface's real pending flag
 * (busy / sending) is true. It carries no timer and fakes nothing — mount it
 * when the request starts, unmount when the response lands.
 *
 * Pure presentational (no hooks) so it stays cheap inside client chat loops.
 */

const VERBS = ["tracing the signal…", "consulting the record…", "composing…"] as const;

export function ThinkingVerb({ seed = 0 }: { seed?: number }) {
  const verb = VERBS[Math.abs(seed) % VERBS.length];
  return (
    <span className={styles.verb} role="status">
      {verb}
    </span>
  );
}
