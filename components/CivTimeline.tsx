/**
 * CivTimeline — the civilization's era strip for /collections (2026-06-11).
 *
 * Parallel's lineage is buried in marketplace UI; nobody in the field
 * narrates their eras on-site (.living-city/web3-worlds.md). This is the
 * counter-move: six mint dates rendered as city history on one gold line.
 *
 * Dates + order are Etherscan/Apescan creation-tx facts (verified
 * 2026-06-11, .living-city/lineage.md) — same source as the `est` lines in
 * lib/collections-data.ts. Positions are proportional to months elapsed
 * from Oct 2023 → Apr 2026 (30 months), so the spacing itself is honest:
 * the long quiet stretches and the recent acceleration are visible.
 *
 * Server component, pure CSS, zero animation.
 */
import styles from "./CivTimeline.module.css";

const ERAS: { name: string; date: string; pos: number; now?: boolean }[] = [
  { name: "The Crypt", date: "OCT 2023", pos: 0 },
  { name: "Crypt TCG", date: "MAY 2024", pos: 23.3 }, // +7 months
  { name: "OOGIES", date: "DEC 2024", pos: 46.7 }, // +14
  { name: "Emile", date: "APR 2025", pos: 60 }, // +18
  { name: "SMILES", date: "DEC 2025", pos: 86.7 }, // +26
  { name: "Freelons", date: "APR 2026", pos: 100, now: true }, // +30 — newest citizens
];

export function CivTimeline() {
  return (
    <section className={styles.wrap} aria-label="Founding timeline — six collections, 2023 to 2026">
      <p className={styles.head}>
        One city. Six collections. <strong>Founded on-chain 2023.</strong>
      </p>
      <div className={styles.scroll}>
        <div className={styles.row}>
          <span className={styles.end}>2023</span>
          <div className={styles.track}>
            <span className={styles.line} aria-hidden="true" />
            {ERAS.map((e) => (
              <span
                key={e.name}
                className={e.now ? `${styles.node} ${styles.now}` : styles.node}
                style={{ left: `${e.pos}%` }}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.name}>{e.name}</span>
                <span className={styles.date}>{e.date}</span>
              </span>
            ))}
          </div>
          <span className={styles.end}>2026</span>
        </div>
      </div>
      {/* MOBILE LADDER (2026-06-11): at phone widths the proportional strip
          collided labels and silently clipped SMILES + Freelons — the newest
          collections cut out of their own history. Same six facts as a
          vertical ladder; CSS swaps the two renders by viewport. */}
      <ol className={styles.ladder}>
        {ERAS.map((e) => (
          <li key={e.name} className={e.now ? `${styles.rung} ${styles.nowRung}` : styles.rung}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.name}>{e.name}</span>
            <span className={styles.date}>{e.date}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
