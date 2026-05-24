/**
 * /hold-the-line — the distributed bid wall mission.
 *
 * Floor-pump specialist's mechanic, executed by the carriers
 * instead of the founder. Each holder places an OpenSea bid
 * above floor × 1.4 — collectively this forms a bid wall that
 * forces undercut listings to cancel + relist higher.
 *
 * Lore frame: the city is under collapse. Defenders bid to hold
 * the line. The architect doesn't ask carriers to give — asks
 * them to back the floor with their own bids, then rewards them.
 *
 * v1: manual claim flow (this page) + admin verification.
 * v2 (future): auto-detect via OpenSea offers API.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { HoldTheLineClient } from "@/components/HoldTheLineClient";
import { getStats } from "@/lib/defender-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hold the Line · Defend the Floor · FREELON CITY",
  description:
    "The city is under collapse. Carriers bid to hold the line. Place an OpenSea bid above floor × 1.4 — earn hex, defend the floor, get the DEFENDER badge.",
};

export default async function HoldTheLinePage() {
  const stats = await getStats();

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* HERO */}
      <section style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker" style={{ color: "#FF5A4D" }}>⚠ THE FLOOR IS UNDER ATTACK</span>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(40px, 7vw, 80px)",
            lineHeight: 0.94,
            letterSpacing: "-0.02em",
            margin: "10px 0 14px",
          }}
        >
          Hold the line.<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>Defend the floor.</em>
        </h1>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            maxWidth: 700,
          }}
        >
          Every seller is racing to the bottom because nobody is bidding above floor.
          One wallet placing 80 bids would fix this — but we don&apos;t need one whale.
          We need 80 carriers each placing one bid. <strong>You are the bid wall.</strong>
        </p>
      </section>

      {/* LIVE COUNTERS */}
      <section
        className="ui-auto-fit-cards"
        style={{
          marginBottom: "var(--s-5)",
          padding: "var(--s-4) var(--s-5)",
          background: "linear-gradient(135deg, rgba(255,90,77,0.10), rgba(200,167,93,0.05))",
          border: "1px solid rgba(255,90,77,0.35)",
          borderRadius: 14,
          ["--min-w" as string]: "180px",
        }}
      >
        <CounterCell label="Defenders" value={stats.totalDefenders.toLocaleString()} sub="carriers who placed a bid" />
        <CounterCell label="Bids placed" value={stats.totalBids.toLocaleString()} sub="active bid wall" />
        <CounterCell label="Hex distributed" value={`${stats.hexCredited.toLocaleString()} ⬡`} sub="paid to defenders so far" />
      </section>

      {/* HOW IT WORKS */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker">⬡ THREE STEPS</span>
        <div style={{ marginTop: "var(--s-3)", display: "grid", gap: "var(--s-3)" }}>
          <Step
            n="01"
            title="Place a bid on OpenSea"
            body="Open the collection. Place a collection offer (or a single-token offer) at AT LEAST 1.4× the current floor. Three suggested tiers below."
          />
          <Step
            n="02"
            title="Tell the city you bid"
            body="Submit the claim form below with your wallet + bid amount + offer URL or tx hash. The architect verifies on-chain."
          />
          <Step
            n="03"
            title="Earn hex"
            body="+500⬡ when verified. +1,000⬡ if your bid fills (you bought!). +2,000⬡ + DEFENDER badge if you hold the bid for 7 days unfilled."
          />
        </div>
      </section>

      {/* Phase 3: BID TIERS + CLAIM FORM grouped as one flow.
          Reduced separation between them so the visual sequence reads
          "pick a tier → place bid → claim hex" without a section break. */}
      <section style={{ marginBottom: "var(--s-3)" }}>
        <span className="kicker">⬡ SUGGESTED TIERS</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65, marginTop: "var(--s-2)", marginBottom: "var(--s-3)" }}>
          Three tiers. The middle one is the highest impact for normal carriers.
          Open OpenSea, click <em style={{ fontStyle: "normal", color: "var(--gold)" }}>Make collection offer</em>, set the price, sign.
        </p>
        <div className="ui-auto-fit-cards" style={{ ["--min-w" as string]: "200px" }}>
          <BidTier eth="0.0035" label="LIGHT" sub="1.4× current floor · cheapest defender slot" />
          <BidTier eth="0.0050" label="STANDARD" sub="2× floor · the wall lives here" highlight />
          <BidTier eth="0.0075" label="HEAVY" sub="3× floor · sends the strongest signal" />
        </div>
        <div style={{ marginTop: "var(--s-3)" }}>
          <a
            className="btn btn-primary"
            href="https://opensea.io/collection/freelons"
            target="_blank"
            rel="noreferrer"
          >
            <span className="ttl">OPEN OPENSEA · MAKE COLLECTION OFFER ↗</span>
          </a>
        </div>
      </section>

      {/* CLAIM FORM */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker">⬡ CLAIM YOUR BID</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65, marginTop: "var(--s-2)", marginBottom: "var(--s-3)" }}>
          After you place the bid, submit here. The architect verifies and credits
          within 24h. (You must be signed in with X — wallet bound — to claim.)
        </p>
        <HoldTheLineClient />
      </section>

      {/* LEADERBOARD */}
      {stats.topDefenders.length > 0 && (
        <section style={{ marginBottom: "var(--s-6)" }}>
          <span className="kicker">⬡ TOP DEFENDERS · 100 MOST RECENT BIDS</span>
          <div style={{ marginTop: "var(--s-3)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
            {stats.topDefenders.map((d, i) => (
              <div
                key={d.wallet}
                className="ui-row-stack"
                style={{
                  padding: "10px 18px",
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  background: i === 0 ? "rgba(200,167,93,0.06)" : "transparent",
                  fontFamily: "var(--mono2)",
                  fontSize: 13,
                  color: "var(--ink)",
                }}
              >
                <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ color: i === 0 ? "var(--gold)" : "var(--ink-dim)", fontWeight: 600, minWidth: 24 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link href={`/wallet/${d.wallet}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                    {d.wallet.slice(0, 6)}…{d.wallet.slice(-4)}
                  </Link>
                </span>
                <span style={{ color: "var(--gold)" }}>{d.bidCount} bid{d.bidCount === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* WHY THIS MATTERS */}
      <section style={{ marginBottom: "var(--s-6)", padding: "var(--s-4)", border: "1px dashed var(--line-2)", borderRadius: 12, background: "rgba(0,0,0,0.3)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ WHY THIS MATTERS</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7, marginTop: "var(--s-2)" }}>
          When you list a citizen and the top bid is below floor, you have to undercut
          to sell. Every undercut drops the floor. When the top bid is <em style={{ fontStyle: "normal", color: "var(--gold)" }}>above</em>
          floor, listings vanish — every seller cancels and relists higher because the
          buyer is already there at a better price.
        </p>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7, marginTop: 10 }}>
          80 active bids at 0.005 Ξ doesn&apos;t cost any one of you much, but together
          it reverses the floor mechanic. This is how Milady, Mferns, and Remilio
          bootstrapped their floors. <strong>The city does not need a whale. It needs the carriers it already has.</strong>
        </p>
      </section>

      {/* SHARE */}
      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ SPREAD THE WORD</span>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <a
            className="btn btn-primary"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `⬡ THE FLOOR IS UNDER ATTACK\n\nI bid to defend FREELON CITY.\n\nNot a whale. Not a fund. Just a carrier placing one bid above floor.\n\nThis is how the wall holds.\n\nfreeloncity.com/hold-the-line\n\n#FREELONCITY #404HEXNOTFOUND`
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="ttl">POST ON X →</span>
          </a>
          <Link className="btn btn-secondary" href="/numbers"><span className="ttl">THE NUMBERS →</span></Link>
        </div>
      </section>
    </main>
  );
}

function CounterCell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.26em", color: "var(--ink-dim)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--display)", fontSize: "clamp(26px, 4vw, 36px)", color: "var(--ink)", lineHeight: 1.05 }}>{value}</div>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article style={{ padding: "var(--s-3) var(--s-4)", border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold)" }}>STEP {n}</span>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 19, margin: 0, letterSpacing: "-0.005em" }}>{title}</h3>
      </div>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, margin: "8px 0 0" }}>{body}</p>
    </article>
  );
}

function BidTier({ eth, label, sub, highlight }: { eth: string; label: string; sub: string; highlight?: boolean }) {
  return (
    <article
      style={{
        padding: "var(--s-3) var(--s-4)",
        border: `1px solid ${highlight ? "var(--gold)" : "var(--line)"}`,
        background: highlight ? "rgba(200,167,93,0.08)" : "rgba(255,255,255,0.02)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.26em", color: highlight ? "var(--gold)" : "var(--ink-dim)", textTransform: "uppercase" }}>
        {label}{highlight && " · RECOMMENDED"}
      </div>
      <div style={{ fontFamily: "var(--display)", fontSize: 30, color: highlight ? "var(--gold)" : "var(--ink)", letterSpacing: "-0.01em", margin: "6px 0" }}>
        {eth} Ξ
      </div>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.5 }}>{sub}</div>
    </article>
  );
}
