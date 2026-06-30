/**
 * CitizenMosaic — the abundance band (2026-06-11 "looks cheap" pass).
 * Pudgy floods its pages with characters; we own 4,040 renders and showed ~6.
 * One full-bleed row of real citizens at real size. Static, lazy, no JS.
 * Curated ids: visually strong, varied civs/castes (incl. the 1/1s at ends).
 */
import styles from "./CitizenMosaic.module.css";
import { gridImageUrl } from "@/lib/constants";

const IDS = [1, 2268, 555, 1892, 777, 404, 123, 3690, 21, 1180, 2762, 4040];

export function CitizenMosaic() {
  return (
    <section className={styles.band} aria-label="Citizens of the city">
      <div className={styles.row}>
        {IDS.map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={id}
            src={gridImageUrl(id, 640)}
            alt={`Citizen #${id}`}
            loading="lazy"
            decoding="async"
            className={styles.face}
          />
        ))}
      </div>
      <p className={styles.cap}>4,040 citizens · ten civilizations · one city</p>
    </section>
  );
}
