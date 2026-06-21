import type { Metadata } from "next";
import Link from "next/link";
import { ECONOMY } from "@/lib/economy-constants";
import { RelaySection } from "@/components/earn/RelaySection";

// 2026-06-21 (page audit): page renders from ECONOMY constants only — no request
// data — so force-dynamic was a no-op that also voided the revalidate. ISR only.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Earn HEX ⬡",
  description: "Earn ⬡ HEX — the in-app credit of FREELON CITY (not money, not redeemable). Hold citizens, relay the signal, and play. Here’s what to do right now.",
};

// ── Page ─────────────────────────────────────────────────────────────
export default async function EarnPage() {
  const saleHexFor01Eth = Math.round(0.01 * ECONOMY.SALE_SHARE_PCT / 100 * ECONOMY.HEX_PER_ETH);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 var(--s-4) var(--s-7)" }}>
      {/* ── STICKY IN-PAGE SUB-NAV ─────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "var(--s-3) 0",
          marginBottom: "var(--s-3)",
          background: "rgba(5,5,5,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span className="kicker" style={{ color: "var(--ink-dim)", marginRight: 4 }}>⬡ EARN</span>
        <a href="#ledger" className="btn btn-secondary btn-sm"><span className="ttl">THE LEDGER</span></a>
        <a href="#relay" className="btn btn-secondary btn-sm"><span className="ttl">RELAY</span></a>
      </nav>

      {/* ── LEDGER ─────────────────────────────────────────────────── */}
      <section id="ledger" style={{ scrollMarginTop: 72 }}>

      {/* ── HERO · single question ─────────────────────────────────── */}
      <section
        style={{
          padding: "var(--s-6) var(--s-5)",
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(90deg, rgba(5,5,5,0.96) 0%, rgba(5,5,5,0.65) 100%), url(/atmos/carrier.webp) center / cover no-repeat",
          border: "1px solid var(--line-2)",
          marginBottom: "var(--s-5)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ EARN HEX</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(40px, 7vw, 72px)", lineHeight: 0.9, margin: "12px 0 14px", letterSpacing: "-0.02em" }}>
          Earn <em style={{ color: "var(--gold)", fontStyle: "normal" }}>⬡ HEX</em><br/>
          for free.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 540 }}>
          ⬡ is the city&apos;s credit — earn it free by showing up and sharing, then spend it to run your
          agent&apos;s jobs. Three ways below: one quick, one daily, one slow burn.
        </p>
        {/* 2026-06-07 funnel: tie earned HEX back to the product so /earn feeds
            the loop instead of being a dead-end sink. */}
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6, maxWidth: 540, marginTop: 10 }}>
          New here? ⬡ is the fuel — you spend it running an unlocked FREELON&apos;s agent.{" "}
          <Link href="/demo" style={{ color: "var(--gold)" }}>See an agent first →</Link>
        </p>
      </section>

      {/* ── HORIZON 1: RIGHT NOW (reframed 2026-06-19 — was the red-signal /
           buy-below-floor bounty board; now the neutral sweep reward) ─────── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <header style={{ marginBottom: "var(--s-3)" }}>
          <span className="kicker" style={{ color: "var(--gold-bright)" }}>① RIGHT NOW · 5 MINUTES</span>
        </header>
        <div
          style={{
            padding: "var(--s-5)",
            borderRadius: 14,
            border: "1px solid var(--line-2)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%)",
          }}
        >
          <h2 style={{ fontFamily: "var(--display)", fontSize: 24, marginBottom: 6, letterSpacing: "-0.01em" }}>
            Sweep a citizen
          </h2>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>
            Buy any FREELON on OpenSea and you earn <strong style={{ color: "var(--gold)" }}>+{ECONOMY.SWEEP_BOUNTY} ⬡</strong>
            {" "}(streak bonus +{ECONOMY.SWEEP_STREAK_BONUS} ⬡ at {ECONOMY.SWEEP_STREAK_THRESHOLD} in 24h) — city credit, not money, not redeemable.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer" className="btn btn-secondary">
              <span className="ttl">BROWSE ON OPENSEA ↗</span>
            </a>
            <Link href="/citizens" className="btn btn-secondary">
              <span className="ttl">BROWSE CITIZENS →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HORIZON 2: TODAY ───────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <header style={{ marginBottom: "var(--s-3)" }}>
          <span className="kicker" style={{ color: "var(--gold)" }}>② TODAY · 30 SECONDS</span>
        </header>
        <div
          style={{
            padding: "var(--s-5)",
            borderRadius: 14,
            border: "1px solid var(--gold)44",
            background: "linear-gradient(180deg, rgba(200,167,93,0.06) 0%, rgba(0,0,0,0.4) 100%)",
          }}
        >
          <h2 style={{ fontFamily: "var(--display)", fontSize: 26, marginBottom: 6, letterSpacing: "-0.01em" }}>
            Post once. Reset the meter.
          </h2>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>
            Share today&apos;s signal on X →
            claim <strong style={{ color: "var(--gold)", fontFamily: "var(--display)", fontSize: 18 }}>+{ECONOMY.DAILY_CLAIM} ⬡</strong>
            {" "}(+{ECONOMY.STREAK_3_BONUS} at 3d, +{ECONOMY.STREAK_7_BONUS} at 7d, +{ECONOMY.STREAK_30_BONUS} at 30d).
            This resets the {ECONOMY.ACTIVITY_DECAY_DAYS}-day decay clock and keeps your background hex ticking.
          </p>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: 14, letterSpacing: "0.05em" }}>
            ⬡ The city only ticks for active carriers. Hit at least {ECONOMY.ACTIVITY_MIN_DAYS_PER_WINDOW} active days per {ECONOMY.ACTIVITY_DECAY_DAYS}-day window or background hex pauses. Posting daily is the easiest way.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/sync#carrier" className="btn btn-primary">
              <span className="ttl">CLAIM TODAY&apos;S {ECONOMY.DAILY_CLAIM} ⬡ →</span>
            </Link>
            <Link href="/earn#relay" className="btn btn-secondary">
              <span className="ttl">⬡ RELAY · POST TEMPLATES →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HORIZON 3: THE LONG GAME ───────────────────────────────── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <header style={{ marginBottom: "var(--s-3)" }}>
          <span className="kicker" style={{ color: "#A989C7" }}>③ THE LONG GAME · WEEKS</span>
        </header>
        <div
          style={{
            padding: "var(--s-5)",
            borderRadius: 14,
            border: "1px solid #A989C744",
            background: "linear-gradient(180deg, rgba(169,137,199,0.06) 0%, rgba(0,0,0,0.4) 100%)",
          }}
        >
          <h2 style={{ fontFamily: "var(--display)", fontSize: 24, marginBottom: 12, letterSpacing: "-0.01em" }}>
            Hold. Train. Transmit. Climb.
          </h2>
          {/* 2026-06-07 density: the 6 long-game earning rows are reference a
              newcomer can't act on right now — folded behind a tap so Horizon 3
              leads with its headline + CTA (mirrors the BURN fold below). */}
          <details>
            <summary style={{ cursor: "pointer", fontFamily: "var(--mono2)", fontSize: 12, color: "#A989C7", letterSpacing: "0.1em", marginBottom: 12 }}>
              ▾ SEE ALL SIX LONG-GAME EARNERS
            </summary>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>
                <strong style={{ fontFamily: "var(--display)", color: "var(--ink)", fontSize: 15 }}>Sale share</strong>
                <span style={{ fontFamily: "var(--mono2)", color: "var(--ink-dim)", fontSize: 11, marginLeft: 8 }}>·  every time you sell a freelon</span>
              </span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "#A989C7", whiteSpace: "nowrap" }}>+{saleHexFor01Eth} ⬡ per 0.01 ETH</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>
                <strong style={{ fontFamily: "var(--display)", color: "var(--ink)", fontSize: 15 }}>Listing bounty</strong>
                <span style={{ fontFamily: "var(--mono2)", color: "var(--ink-dim)", fontSize: 11, marginLeft: 8 }}>· listings older than 24h</span>
              </span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "#A989C7", whiteSpace: "nowrap" }}>+{ECONOMY.LISTING_BOUNTY_PER_DAY} ⬡/day each</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>
                <strong style={{ fontFamily: "var(--display)", color: "var(--ink)", fontSize: 15 }}>Passive holding</strong>
                <span style={{ fontFamily: "var(--mono2)", color: "var(--ink-dim)", fontSize: 11, marginLeft: 8 }}>· pauses if cold</span>
              </span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "#A989C7", whiteSpace: "nowrap" }}>+{ECONOMY.PER_CITIZEN_PER_DAY} ⬡/citizen/day</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>
                <strong style={{ fontFamily: "var(--display)", color: "var(--ink)", fontSize: 15 }}>Fresh blood</strong>
                <span style={{ fontFamily: "var(--mono2)", color: "var(--ink-dim)", fontSize: 11, marginLeft: 8 }}>· first freelon, one-time</span>
              </span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "#A989C7", whiteSpace: "nowrap" }}>+{ECONOMY.FRESH_BLOOD_BOUNTY} ⬡</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>
                <strong style={{ fontFamily: "var(--display)", color: "var(--ink)", fontSize: 15 }}>Quests</strong>
                <span style={{ fontFamily: "var(--mono2)", color: "var(--ink-dim)", fontSize: 11, marginLeft: 8 }}>· tourist / archivist / hunter / doctrine</span>
              </span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "#A989C7", whiteSpace: "nowrap" }}>+{ECONOMY.CITY_TOURIST_REWARD} → +{ECONOMY.DOCTRINE_MASTER_REWARD} ⬡</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0" }}>
              <span>
                <strong style={{ fontFamily: "var(--display)", color: "var(--ink)", fontSize: 15 }}>Transmissions</strong>
                <span style={{ fontFamily: "var(--mono2)", color: "var(--ink-dim)", fontSize: 11, marginLeft: 8 }}>· earn when others boost yours</span>
              </span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "#A989C7", whiteSpace: "nowrap" }}>10% of every boost ⬡</span>
            </li>
          </ul>
          </details>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Link href="/transmissions" className="btn btn-primary">
              <span className="ttl">⬡ TRANSMIT YOUR SIGNAL →</span>
            </Link>
            <Link href="/dashboard#civ-war" className="btn btn-secondary">
              <span className="ttl">CIV WARS →</span>
            </Link>
            <Link href="/dashboard#earners" className="btn btn-secondary">
              <span className="ttl">LEADERBOARD →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── BURN · collapsed by default via details ────────────────── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <details style={{ border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
          <summary style={{ cursor: "pointer", padding: "16px var(--s-4)", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="kicker" style={{ color: "#FF8A4D" }}>⬡ BURN · WHERE HEX GOES</span>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.05em" }}>
                Naming · realign · boost · feature · signal burst · custom title · tithe · shop
              </span>
            </span>
            <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.2em" }}>EXPAND ▾</span>
          </summary>
          <div style={{ padding: "0 var(--s-4) var(--s-4)" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <BurnRow name="Naming"            cost={ECONOMY.NAMING_COST}            how="Permanent display name on a citizen." />
              <BurnRow name="Civ realign"       cost={ECONOMY.REALIGN_COST}           how="Move a Common citizen to a different civ. Rarity-preserving." />
              <BurnRow name="Boost listing"     cost={ECONOMY.BOOST_LISTING_PER_DAY}  how="Pin your listing at the top of the collection view for 24h." />
              <BurnRow name="Feature citizen"   cost={ECONOMY.FEATURE_CITIZEN_24H}    how="Hero slot on /civilizations for 24h." />
              <BurnRow name="Signal Burst"      cost={ECONOMY.SIGNAL_BURST_COST}      how="Top-of-feed spotlight on the homepage." />
              <BurnRow name="Custom title"      cost={ECONOMY.CUSTOM_TITLE_COST}      how="Vanity title on your /carrier page." />
              <BurnRow name="Tithe"             cost={ECONOMY.TITHE_MIN}              how={`Burn ≥ ${ECONOMY.TITHE_MIN} ⬡ → name on /tribute for 7 days.`} href="/tribute#patrons" />
              <BurnRow name="Shop"              cost={ECONOMY.SHOP_MIN}               how={`30 artifacts. ${ECONOMY.SHOP_MIN}–${ECONOMY.SHOP_MAX} ⬡.`} href="/shop" />
            </ul>
          </div>
        </details>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: "var(--s-6)", padding: "var(--s-5) var(--s-4) 0", borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)", fontFamily: "var(--mono2)" }}>
          You&apos;re a carrier. Carriers do work.
        </p>
        {/* CLAIM lives once now — the primary button in "② TODAY" above. This
            closer points onward to the live city (2026-06-07 dedup). */}
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/dashboard">
            <span className="ttl">VIEW LIVE SIGNALS →</span>
          </Link>
        </div>
      </section>

      {/* end #ledger */}
      </section>

      {/* ── RELAY ──────────────────────────────────────────────────── */}
      <section
        id="relay"
        style={{ scrollMarginTop: 72, marginTop: "var(--s-7)", paddingTop: "var(--s-6)", borderTop: "1px solid var(--line-2)" }}
      >
        <RelaySection />
      </section>

    </div>
  );
}

function BurnRow({ name, cost, how, href }: { name: string; cost: number; how: string; href?: string }) {
  return (
    <li style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 14, color: "var(--ink)", letterSpacing: "-0.005em" }}>{name}</span>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)" }}>{how}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "#FF8A4D", fontWeight: 600, whiteSpace: "nowrap" }}>
          {cost.toLocaleString()} ⬡
        </span>
        {href && (
          <Link href={href} style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", textDecoration: "none", letterSpacing: "0.18em" }}>
            GO →
          </Link>
        )}
      </div>
    </li>
  );
}
