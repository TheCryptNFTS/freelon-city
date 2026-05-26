/**
 * /numbers — live public stats. The one page anyone (investor, studio,
 * journalist, holder) can hit to verify the city is real and moving.
 *
 * All values derive from systems that already exist:
 *   - OpenSea v2 collection stats   → sales / volume / holders / floor
 *   - listWalletHexRecords           → hex aggregates across all wallets
 *   - listTransmissions              → community signal volume
 *
 * Revalidates every 5 min so a refresh always returns a fresh snapshot
 * without hammering OpenSea on every request.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CONTRACT, TOTAL } from "@/lib/constants";
import { SITE } from "@/lib/share";
import { listWalletHexRecords } from "@/lib/wallet-hex-store";
import { listTransmissions } from "@/lib/transmissions-store";
import { getCollapseState } from "@/lib/collapse-mode";

export const revalidate = 300;

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "One pulse for the city: live receipts, sealed supply, and current signal state.";
export const metadata: Metadata = {
  title: "Pulse · Live City Receipts",
  description: PAGE_DESC,
  openGraph: {
    title: "Pulse · Live City Receipts",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse · Live City Receipts",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

const COLLECTION_SLUG = "freelons";

type OSStats = {
  total?: {
    volume?: number;
    sales?: number;
    average_price?: number;
    num_owners?: number;
    market_cap?: number;
    floor_price?: number;
  };
  intervals?: Array<{
    interval: string;
    volume?: number;
    sales?: number;
    average_price?: number;
  }>;
};

async function fetchOpenSeaStats(): Promise<OSStats | null> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(
      `https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}/stats`,
      { headers: { "X-API-KEY": apiKey, accept: "application/json" }, next: { revalidate: 300 } },
    );
    if (!r.ok) return null;
    return (await r.json()) as OSStats;
  } catch {
    return null;
  }
}

function fmtEth(n: number | null | undefined, digits = 3): string {
  if (n == null || !isFinite(n)) return "—";
  return n.toFixed(digits) + " Ξ";
}
function fmtInt(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}
function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

export default async function NumbersPage() {
  const [stats, hexRecords, txs, collapse] = await Promise.all([
    fetchOpenSeaStats(),
    listWalletHexRecords(500).catch(() => []),
    listTransmissions({ by: "score", limit: 100 }).catch(() => []),
    getCollapseState().catch(() => ({ active: false })),
  ]);

  // OpenSea
  const total = stats?.total;
  const oneDay = stats?.intervals?.find((i) => i.interval === "one_day");
  const sevenDay = stats?.intervals?.find((i) => i.interval === "seven_day");
  const thirtyDay = stats?.intervals?.find((i) => i.interval === "thirty_day");

  // Hex aggregates
  const hexBalanceTotal = hexRecords.reduce((a, r) => a + (r.balance || 0), 0);
  const hexLifetimeTotal = hexRecords.reduce((a, r) => a + (r.lifetimeEarned || 0), 0);
  // Burn = lifetime earned across all wallets minus current balance across all.
  // Excludes hex held in still-active balances; counts hex that left a wallet
  // (via tithe, naming, realign, transmission, boost — all the sinks).
  const hexBurnedTotal = Math.max(0, hexLifetimeTotal - hexBalanceTotal);
  const trackedWallets = hexRecords.length;
  const activeWallets = hexRecords.filter((r) => (r.balance || 0) > 0).length;
  const carriersWithClaimStreak = hexRecords.filter((r) => (r.claimStreak ?? 0) > 0).length;

  // Transmissions
  const txCount = txs.length;
  const txSignals = txs.reduce((a, t) => a + (t.signals || 0), 0);
  const txBoostHex = txs.reduce((a, t) => a + (t.boostHex || 0), 0);
  const topTx = txs[0] || null;

  // Phase 3: Pulse hero — one number that defines the city's
  // current state. Floor × supply is the cleanest single answer to
  // "what is FREELON CITY worth right now?" — paired with a live
  // status pill (ACTIVE / COLLAPSE) so a single glance tells you
  // value + health.
  const stateActive = !collapse.active;
  const stateColor = stateActive ? "var(--state-active)" : "var(--state-warning)";
  const stateLabel = stateActive ? "ACTIVE" : "COLLAPSE";

  return (
    <div className="numbers-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* Phase 3: PULSE hero — one hero stat + live city state. */}
      <section style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ PULSE · LIVE FROM THE CITY</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.96, letterSpacing: "-0.02em", margin: "10px 0 8px" }}>
          The Pulse.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 640, marginBottom: "var(--s-4)" }}>
          One pulse — market cap at floor × current state. Every receipt
          below. No screenshots, no curated highlights. Auto-updated every
          5 minutes.
        </p>

        <div
          className="pulse-hero"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
            gap: "var(--s-3)",
            marginTop: "var(--s-3)",
          }}
        >
          <div
            style={{
              padding: "var(--s-5) var(--s-5) var(--s-4)",
              borderRadius: 18,
              border: `2px solid ${stateColor}`,
              background: `linear-gradient(135deg, ${stateColor}14, rgba(0,0,0,0.5))`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.28em", color: stateColor, textTransform: "uppercase", fontWeight: 700 }}>
              MARKET CAP · AT FLOOR
            </span>
            <div style={{ fontFamily: "var(--display)", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.95, color: "var(--ink)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {fmtEth(
                total?.market_cap ||
                  (Number(total?.floor_price || 0) * TOTAL),
                2,
              )}
            </div>
            <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", letterSpacing: "0.06em" }}>
              floor × {TOTAL.toLocaleString()} supply · {fmtInt(total?.num_owners)} holders
            </span>
          </div>

          <div
            style={{
              padding: "var(--s-4)",
              borderRadius: 18,
              border: `1px solid ${stateColor}55`,
              background: `${stateColor}0a`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
              CITY STATE
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: stateColor,
                  boxShadow: `0 0 14px ${stateColor}`,
                }}
                aria-hidden
              />
              <span style={{ fontFamily: "var(--display)", fontSize: 32, color: stateColor, fontWeight: 400, letterSpacing: "-0.005em" }}>
                {stateLabel}
              </span>
            </div>
            <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", letterSpacing: "0.05em", lineHeight: 1.5 }}>
              {stateActive
                ? "Earnings flow at 1.0×. Burns at 1.0×. The grid holds."
                : "Earnings reduced. Burns reduced. Defenders called to the floor."}
            </span>
          </div>
        </div>

        <style>{`
          @media (max-width: 760px) {
            .pulse-hero { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ── MARKET ── */}
      <Section title="Market">
        <Grid>
          <Stat label="Floor price" value={fmtEth(total?.floor_price ?? 0, 4)} />
          <Stat label="Holders" value={fmtInt(total?.num_owners)} sub={`of ${TOTAL.toLocaleString()} supply`} />
          <Stat label="Lifetime volume" value={fmtEth(total?.volume, 2)} sub={`${fmtInt(total?.sales)} sales`} />
          <Stat label="Market cap (est.)" value={fmtEth(total?.market_cap, 2)} sub="floor × supply" />
        </Grid>
        <Grid style={{ marginTop: "var(--s-3)" }}>
          <Stat label="24h volume" value={fmtEth(oneDay?.volume, 3)} sub={`${fmtInt(oneDay?.sales)} sales`} />
          <Stat label="7d volume" value={fmtEth(sevenDay?.volume, 2)} sub={`${fmtInt(sevenDay?.sales)} sales`} />
          <Stat label="30d volume" value={fmtEth(thirtyDay?.volume, 2)} sub={`${fmtInt(thirtyDay?.sales)} sales`} />
          <Stat label="Avg sale (lifetime)" value={fmtEth(total?.average_price, 4)} />
        </Grid>
      </Section>

      {/* ── HEX ECONOMY ── */}
      <Section title="Hex economy">
        <Grid>
          <Stat label="Hex in circulation" value={`${fmtInt(hexBalanceTotal)} ⬡`} sub="sum of all wallet balances" />
          <Stat label="Hex burned (lifetime)" value={`${fmtInt(hexBurnedTotal)} ⬡`} sub="all sinks · tithes, names, realigns, transmissions, boosts" />
          <Stat label="Tracked wallets" value={fmtInt(trackedWallets)} sub={`${fmtInt(activeWallets)} active · hex > 0`} />
          <Stat label="Daily-claim streakers" value={fmtInt(carriersWithClaimStreak)} sub="wallets with an unbroken claim streak" />
        </Grid>
      </Section>

      {/* ── TRANSMISSIONS ── */}
      <Section title="Transmissions">
        <Grid>
          <Stat label="Transmissions live" value={fmtInt(txCount)} />
          <Stat label="Signals given" value={fmtInt(txSignals)} sub="free ⬢ from carriers" />
          <Stat label="Hex boosted" value={`${fmtInt(txBoostHex)} ⬡`} sub="paid amplification" />
          <Stat
            label="Top transmission"
            value={topTx ? `@${topTx.authorHandle}` : "—"}
            sub={topTx ? `score ${topTx.score} · ${topTx.signals} ⬢ · ${topTx.boostHex} ⬡` : "no transmissions yet"}
            href={topTx ? `/transmissions/${topTx.id}` : undefined}
          />
        </Grid>
      </Section>

      {/* Audit 2026-05-25: DUMP DETERRENT section removed.
         "rescuer paid · dumper burned" + all-zero counters read as
         punitive AND broken — both bad. The underlying ghost/dump
         ledger remains intact at /graveyard for receipts. */}

      {/* ── CONTRACT ── */}
      <Section title="Contract">
        <Grid>
          <Stat
            label="Contract"
            value={
              // Wraps inside the card on narrow screens (Discord 2026-05-25:
              // "contract address is over boxing if viewed in a smaller window").
              // word-break:break-all is safe for hex strings.
              <code style={{ fontSize: 12, wordBreak: "break-all", overflowWrap: "anywhere", display: "block", lineHeight: 1.4 }}>{CONTRACT}</code>
            }
            sub="Ethereum mainnet · ERC-721"
          />
          <Stat
            label="Supply"
            value={`${TOTAL.toLocaleString()} citizens`}
            sub="hard-capped · no mint left"
          />
          <Stat
            label="OpenSea"
            value="freelons"
            sub="primary marketplace"
            href={`https://opensea.io/collection/${COLLECTION_SLUG}`}
            external
          />
          <Stat
            label="Etherscan"
            value="view contract"
            href={`https://etherscan.io/address/${CONTRACT}`}
            external
          />
        </Grid>
      </Section>

      <section style={{ marginTop: "var(--s-7)", padding: "var(--s-4)", border: "1px dashed var(--line-2)", borderRadius: 12, background: "rgba(0,0,0,0.3)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ HOW THIS PAGE WORKS</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7, marginTop: 10 }}>
          Every number is read live from the source: OpenSea v2 for market data, the city&apos;s Upstash ledger for
          hex flow and transmissions, and the on-chain contract for supply. There is no manual curation. The
          page revalidates every 5 minutes so a refresh always returns fresh data without hammering OpenSea.
          When the city is quiet, the numbers reflect quiet. When it moves, the numbers move.
        </p>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6, marginTop: 12 }}>
          Last computed: <span style={{ color: "var(--ink-2)" }}>{new Date().toISOString().slice(0, 19).replace("T", " ")} UTC</span>
        </p>
      </section>

      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/leaderboard">
            <span className="ttl">THE LEADERBOARD →</span>
          </Link>
          <Link className="btn btn-secondary" href="/graveyard">
            <span className="ttl">THE GRAVEYARD →</span>
          </Link>
          <Link className="btn btn-secondary" href={SITE}>
            <span className="ttl">HOMEPAGE →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Local components
// ─────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--s-5)" }}>
      <span className="kicker">⬡ {title.toUpperCase()}</span>
      <div style={{ marginTop: "var(--s-3)" }}>{children}</div>
    </section>
  );
}

function Grid({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "var(--s-3)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Stat({
  label, value, sub, href, external,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  external?: boolean;
}) {
  const card = (
    <div
      style={{
        padding: "var(--s-3) var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 96,
      }}
    >
      <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--display)", fontSize: "clamp(22px, 2.5vw, 30px)", lineHeight: 1.1, color: "var(--ink)", letterSpacing: "-0.005em" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );
  if (!href) return card;
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>{card}</a>
  ) : (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{card}</Link>
  );
}
