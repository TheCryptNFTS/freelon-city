/**
 * CanonRoadmap — the city's NOW / NEXT / LATER commitment, folded into
 * /canon#roadmap (2026-05-31). Migrated from the /roadmap page so the
 * canonical reference library holds the public direction alongside the
 * lore. SHIPPED → NOW → NEXT → LATER buckets, no dated promises.
 * Server component — static markup.
 */
import Link from "next/link";

type Status = "SHIPPED" | "NOW" | "NEXT" | "LATER";

const ITEMS: Array<{ status: Status; title: string; body: string; href?: string }> = [
  // ─── SHIPPED ───
  {
    status: "SHIPPED",
    title: "Signal-loss enforcement",
    body: "Listings ≤85% of floor become 404 SIGNAL LOST on every city surface. Wallets who restore them earn hex and permanent attribution. Wallets who break the floor lose hex. Clean-wallet streaks compound the rewards.",
    href: "/graveyard",
  },
  {
    status: "SHIPPED",
    title: "4-hour X autopost",
    body: "Top sale every 4h posted as a digest with the citizen's image. @4040hex speaks on its own rhythm.",
  },
  {
    status: "SHIPPED",
    title: "Transmissions",
    body: "Carriers transmit their own signal — image + caption + civ. Boost with hex. Top weekly transmission earns 5,000 ⬡.",
    href: "/transmissions",
  },
  {
    status: "SHIPPED",
    title: "Daily X share + streak bonuses",
    body: "Carriers earn +10 ⬡ daily. 3-day = +25 ⬡. 7-day = +100 ⬡. 30-day = +500 ⬡. Streak resets on miss.",
    href: "/earn",
  },
  {
    status: "SHIPPED",
    title: "Carrier channels for honorary holders",
    body: "Honorary citizen owners unlock /channel/[handle] with claimable rights: doctrine for a day, verified relay slot, annual canon coordinate.",
  },
  {
    status: "SHIPPED",
    title: "Live public stats — /numbers",
    body: "Every market + hex + transmission + dump-deterrent number on one auto-updating page. No screenshots, no curation.",
    href: "/numbers",
  },

  // ─── NOW ───
  {
    status: "NOW",
    title: "Weekly receipts cadence",
    body: "Every Sunday at signal time, an auto-posted thread from @4040hex with the week's volume, holders, hex flow, top transmission. Consistency is the brand.",
  },
  {
    status: "NOW",
    title: "Press kit + public assets",
    body: "Logo pack, OG card gallery, brand voice notes, contact route. Make it easy for ingestors and studios to write about the city.",
    href: "/press",
  },
  {
    status: "NOW",
    title: "Defensive hardening pass",
    body: "Continuous audit cadence — atomicity, race-conditions, OpenSea response shape, BigInt precision, OAuth flow. Done as findings emerge.",
  },

  // ─── NEXT ───
  {
    status: "NEXT",
    title: "Hex utility expansion",
    body: "Hex unlocks discounts on partner drops, supplementary collections, and city-issued merch. Hex is in-game city credits — it is not a token, it is not redeemable, and it is not an investment. The more you can spend it on, the more reasons to earn it.",
  },
  {
    status: "NEXT",
    title: "The Signal Chooses (weekly allocation)",
    body: "Once a week the city allocates resources — a cosmetic frame, a featured citizen slot, a 1/1 mention — to a random active carrier. Participation-based, not pro-rata. Lore-driven, not financial.",
  },
  {
    status: "NEXT",
    title: "Personal-use IP statement per citizen",
    body: "Every holder gets a clear written license: your citizen is your personal IP. Commercial use requires a separate permission. Brings the city closer to BAYC-style holder rights without taking the full leap.",
  },
  {
    status: "NEXT",
    title: "Public treasury address",
    body: "One 0x to watch. Royalty inflows visible on Etherscan. Make 'where does the money go' answerable with a single link.",
  },
  {
    status: "NEXT",
    title: "Heat board reactive caching",
    body: "Live civ-heat surface should react instantly to sales/listings rather than waiting on revalidate windows. Cheap latency win.",
  },

  // ─── LATER ───
  {
    status: "LATER",
    title: "Supplementary collection — hex-burn priced for current holders",
    body: "A small, adjacent collection (working size: 1010) priced in hex, holder-only mint window first. Doesn't dilute the 4040 cap. Gives existing holders a flex and creates a real hex sink.",
  },
  {
    status: "LATER",
    title: "Partnership program",
    body: "Other NFT brands get a /partner/[brand] surface — co-branded transmission cards, cross-promotion windows, shared signal hashtag mechanics.",
  },
  {
    status: "LATER",
    title: "City almanac — printable / PDF year-in-review",
    body: "End of year, the city publishes a free printable almanac: top transmissions, largest signal recoveries, named citizens, doctrine fragments collected. Historical record holders can print.",
  },
];

const STATUS_STYLE: Record<Status, { color: string; bg: string; border: string; sub: string }> = {
  SHIPPED: { color: "var(--state-active)", bg: "rgba(122,224,141,0.06)", border: "rgba(122,224,141,0.27)", sub: "in the city now" },
  NOW:     { color: "var(--state-surge)", bg: "rgba(232,178,71,0.07)",  border: "rgba(232,178,71,0.40)", sub: "building this week" },
  NEXT:    { color: "#A989C7", bg: "rgba(169,137,199,0.07)", border: "rgba(169,137,199,0.27)", sub: "committed direction" },
  LATER:   { color: "var(--ink-dim)", bg: "rgba(255,255,255,0.02)", border: "var(--line)", sub: "on the horizon" },
};

export function CanonRoadmap() {
  const buckets: Status[] = ["SHIPPED", "NOW", "NEXT", "LATER"];
  return (
    <div style={{ marginTop: "var(--s-3)", paddingTop: "var(--s-3)", borderTop: "1px dashed var(--line)" }}>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.7, margin: "0 0 var(--s-4)" }}>
        No dated promises. Items move{" "}
        <strong style={{ color: "var(--state-active)" }}>SHIPPED</strong> →{" "}
        <strong style={{ color: "var(--state-surge)" }}>NOW</strong> →{" "}
        <strong style={{ color: "#A989C7" }}>NEXT</strong> →{" "}
        <strong style={{ color: "var(--ink-dim)" }}>LATER</strong> as the city is built. This page is part of the contract: it updates when work moves.
      </p>

      {buckets.map((s) => {
        const items = ITEMS.filter((i) => i.status === s);
        if (items.length === 0) return null;
        const st = STATUS_STYLE[s];
        return (
          <section key={s} style={{ marginBottom: "var(--s-4)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: "var(--s-3)" }}>
              <span
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 10,
                  letterSpacing: "0.30em",
                  color: st.color,
                  padding: "4px 11px",
                  border: `1px solid ${st.border}`,
                  background: st.bg,
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                ⬡ {s}
              </span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {st.sub} · {items.length}
              </span>
            </div>
            <div style={{ display: "grid", gap: "var(--s-3)" }}>
              {items.map((it, i) => (
                <article
                  key={`${s}-${i}`}
                  style={{
                    padding: "var(--s-3) var(--s-4)",
                    border: `1px solid ${st.border}`,
                    background: st.bg,
                    borderRadius: 12,
                  }}
                >
                  <h4 style={{ fontFamily: "var(--display)", fontSize: 17, margin: 0, letterSpacing: "-0.005em", color: "var(--ink)" }}>
                    {it.title}
                  </h4>
                  <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, margin: "8px 0 0" }}>
                    {it.body}
                  </p>
                  {it.href && (
                    <Link
                      href={it.href}
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        fontFamily: "var(--mono2)",
                        fontSize: 10,
                        letterSpacing: "0.24em",
                        color: st.color,
                        textTransform: "uppercase",
                      }}
                    >
                      view in the city →
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
