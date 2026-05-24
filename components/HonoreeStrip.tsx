/**
 * <HonoreeStrip /> — small horizontal row of named honoree faces.
 *
 * Sits above the fold on the homepage as the "logo bar" social proof.
 * The CRO + Growth pros both flagged this as the highest-leverage
 * unused asset on the site — Vitalik / Beeple / punk6529 / xcopy are
 * already in the collection as honoraries; their faces are the
 * fastest trust signal a stranger could get.
 *
 * Server component. Reads citizens.json directly, picks the most
 * recognisable handles, renders their tiny PFP + handle. Click goes
 * to the tribute page for that honoree.
 *
 * Order is hard-coded by recognition rather than alphabetical so the
 * heaviest names (Vitalik, Beeple, punk6529) lead.
 */
import Link from "next/link";
import { getHonoraries } from "@/lib/citizens";
import { imageUrl } from "@/lib/constants";

// Recognition-ordered. Lead with the biggest names — first impressions
// happen left-to-right. If a handle isn't in citizens.json the strip
// gracefully skips it.
const PRIORITY_HANDLES = [
  "vitalikbuterin",
  "beeple",
  "punk6529",
  "xcopyart",
  "lucanetz",
  "gmoneyNFT",
  "cryptogarga",
  "pranksy",
];

export function HonoreeStrip({ max = 7 }: { max?: number }) {
  const all = getHonoraries();
  const byHandle = new Map(
    all
      .filter((h) => h.honoree_handle)
      .map((h) => [(h.honoree_handle || "").replace(/^@/, "").toLowerCase(), h] as const),
  );
  // Take priority handles first, then fill from the rest if we're short
  const picked: typeof all = [];
  for (const h of PRIORITY_HANDLES) {
    const found = byHandle.get(h.toLowerCase());
    if (found && !picked.includes(found)) picked.push(found);
    if (picked.length >= max) break;
  }
  if (picked.length < max) {
    for (const h of all) {
      if (!picked.includes(h)) picked.push(h);
      if (picked.length >= max) break;
    }
  }

  return (
    <div className="honoree-strip" aria-label="Named after these signal carriers">
      <span className="hs-label">⬡ NAMED AFTER</span>
      <div className="hs-row">
        {picked.map((h) => {
          const handle = (h.honoree_handle || "").replace(/^@/, "") || String(h.id);
          return (
            <Link
              key={h.id}
              href={`/tribute/${handle}`}
              className="hs-cell"
              title={h.honoree || handle}
              aria-label={h.honoree || handle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(h.id)} alt="" loading="lazy" />
              <span className="hs-name">{h.honoree?.split(" ")[0] || handle}</span>
            </Link>
          );
        })}
        <Link href="/tribute" className="hs-more">+{all.length - picked.length} more →</Link>
      </div>
      <style>{`
        .honoree-strip {
          margin: 14px 0 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 100%;
        }
        .hs-label {
          font-family: var(--mono2);
          font-size: 9px;
          letter-spacing: 0.32em;
          color: var(--ink-dim);
          text-transform: uppercase;
        }
        .hs-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .hs-cell {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px 4px 4px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: rgba(255,255,255,0.02);
          color: var(--ink);
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-decoration: none;
          text-transform: none;
          transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
        }
        .hs-cell img {
          width: 24px; height: 24px;
          border-radius: 50%;
          object-fit: cover;
          background: #000;
          flex-shrink: 0;
        }
        .hs-cell:hover {
          border-color: var(--gold);
          background: rgba(200,167,93,0.10);
          transform: translateY(-1px);
        }
        .hs-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hs-more {
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--gold);
          text-decoration: none;
          padding: 4px 10px;
        }
        .hs-more:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
