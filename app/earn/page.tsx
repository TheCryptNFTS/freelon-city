import type { Metadata } from "next";
import Link from "next/link";
import { ECONOMY } from "@/lib/economy-constants";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "The Ledger ⬡ · FREELON CITY",
  description: "Today's mission. Active carriers earn. Lazy holders decay. The full economy of FREELON CITY.",
};

// ── Server-side live signals ─────────────────────────────────────────
type LiveStats = {
  redSignalCount: number;
  topBounty: number;
  floor: number | null;
};

async function fetchLive(): Promise<LiveStats> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return { redSignalCount: 0, topBounty: 0, floor: null };
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const [redRes, statsRes] = await Promise.all([
      fetchWithTimeout(`${base}/api/market/red-signals`, { next: { revalidate: 300 }, timeoutMs: 4000 }).catch(() => null),
      fetchWithTimeout("https://api.opensea.io/api/v2/collections/freelons/stats", {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 300 },
        timeoutMs: 4000,
      }).catch(() => null),
    ]);
    const red = redRes && redRes.ok ? await redRes.json() : { signals: [] };
    const stats = statsRes && statsRes.ok ? await statsRes.json() : null;
    const signals: Array<{ bountyHex: number }> = red.signals || [];
    return {
      redSignalCount: signals.length,
      topBounty: signals[0]?.bountyHex || 0,
      floor: stats?.total?.floor_price ?? null,
    };
  } catch {
    return { redSignalCount: 0, topBounty: 0, floor: null };
  }
}

// ── Card primitives ──────────────────────────────────────────────────
type Status = "live" | "ready" | "cooling" | "locked";
const STATUS_META: Record<Status, { label: string; color: string; pulse: boolean }> = {
  live:    { label: "● LIVE NOW",     color: "#FF5A4D", pulse: true },
  ready:   { label: "● READY",        color: "#7AE08D", pulse: false },
  cooling: { label: "⏰ COOLDOWN",     color: "#E8B247", pulse: false },
  locked:  { label: "⬡ ONE-TIME",     color: "var(--ink-dim)", pulse: false },
};

function StatusPill({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--mono2)",
        fontSize: 10,
        letterSpacing: "0.22em",
        color: meta.color,
        textTransform: "uppercase",
        fontWeight: 600,
        padding: "3px 8px",
        border: `1px solid ${meta.color}44`,
        borderRadius: 999,
        background: `${meta.color}10`,
        animation: meta.pulse ? "pulseGlow 2s ease-in-out infinite" : undefined,
      }}
    >
      {meta.label}
    </span>
  );
}

type EarnCard = {
  status: Status;
  num: string;
  unit: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  accent?: string;
};

function MissionCard({ c }: { c: EarnCard }) {
  const accent = c.accent || "var(--gold)";
  return (
    <article
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "var(--s-4)",
        border: `1px solid ${accent}44`,
        borderRadius: 14,
        background: `linear-gradient(180deg, ${accent}08 0%, rgba(0,0,0,0.4) 100%)`,
        minHeight: 200,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <StatusPill status={c.status} />
        <span style={{ fontFamily: "var(--mono2)", fontSize: 9, letterSpacing: "0.18em", color: "var(--ink-dim)", textTransform: "uppercase" }}>{c.unit}</span>
      </div>
      <div>
        <div style={{ fontFamily: "var(--display)", fontSize: 42, lineHeight: 1, color: accent, letterSpacing: "-0.02em" }}>{c.num}</div>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 8, marginBottom: 4, letterSpacing: "-0.005em", textTransform: "uppercase" }}>{c.title}</h3>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.55, color: "var(--ink-2)" }}>{c.body}</p>
      </div>
      {c.cta && (
        <Link
          href={c.cta.href}
          style={{
            marginTop: "auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            border: `1px solid ${accent}`,
            borderRadius: 8,
            color: accent,
            textDecoration: "none",
            fontFamily: "var(--mono2)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {c.cta.label}
          <span style={{ marginLeft: 8 }}>→</span>
        </Link>
      )}
    </article>
  );
}

function BandHero({
  image,
  kicker,
  title,
  blurb,
  accent,
}: {
  image: string;
  kicker: string;
  title: string;
  blurb: string;
  accent: string;
}) {
  return (
    <header
      style={{
        position: "relative",
        marginTop: "var(--s-6)",
        marginBottom: "var(--s-4)",
        padding: "var(--s-5) var(--s-4)",
        borderRadius: 14,
        overflow: "hidden",
        background: `linear-gradient(90deg, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 60%, rgba(5,5,5,0.3) 100%), url(${image}) center / cover no-repeat`,
        border: `1px solid ${accent}33`,
      }}
    >
      <span className="kicker" style={{ color: accent }}>{kicker}</span>
      <h2 style={{ fontFamily: "var(--display)", fontSize: 32, marginTop: 6, marginBottom: 4, letterSpacing: "-0.01em" }}>{title}</h2>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", maxWidth: 600 }}>{blurb}</p>
    </header>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default async function EarnPage() {
  const live = await fetchLive();
  const saleHexFor01Eth = Math.round(0.01 * ECONOMY.SALE_SHARE_PCT / 100 * ECONOMY.HEX_PER_ETH);

  const nowCards: EarnCard[] = [
    {
      status: live.redSignalCount > 0 ? "live" : "ready",
      num: live.redSignalCount > 0 ? `+${live.topBounty}⬡` : `up to +${ECONOMY.SNIPE_BOUNTY_CAP}⬡`,
      unit: live.redSignalCount > 0 ? `${live.redSignalCount} flagged · top bounty` : "watching the floor",
      title: "🔴 Snipe a Red Signal",
      body: `Listings priced ≤ ${ECONOMY.RED_SIGNAL_THRESHOLD * 100}% of floor get flagged on /dashboard. Buy one, hold ${ECONOMY.SNIPE_HOLD_DAYS} days, bounty auto-credits. Max ${ECONOMY.SNIPE_MAX_PER_DAY}/day.`,
      cta: { label: "VIEW SIGNALS", href: "/dashboard" },
      accent: "#FF5A4D",
    },
    {
      status: "ready",
      num: `+${saleHexFor01Eth}⬡`,
      unit: `per 0.01 ETH sold · ${ECONOMY.SALE_SHARE_PCT}%`,
      title: "Sell into liquidity",
      body: `${ECONOMY.SALE_SHARE_PCT}% of every sale auto-credits in hex (peg ${ECONOMY.HEX_PER_ETH.toLocaleString()} ⬡ = 1 ETH). Cap ${ECONOMY.SALE_SHARE_MAX_PER_24H} sales/24h.`,
      cta: { label: "GO TO OPENSEA ↗", href: "https://opensea.io/collection/freelons" },
      accent: "var(--gold)",
    },
    {
      status: "ready",
      num: `+${ECONOMY.SWEEP_BOUNTY}⬡`,
      unit: `per sweep · streak +${ECONOMY.SWEEP_STREAK_BONUS}`,
      title: "Sweep the floor",
      body: `Buy at or near floor. Daily cap ${ECONOMY.SWEEP_DAILY_CAP} ⬡. Hit ${ECONOMY.SWEEP_STREAK_THRESHOLD}+ sweeps in 24h for the streak bonus.`,
      cta: { label: "FIND A FLOOR PIECE", href: "/dashboard" },
      accent: "#7AB7FF",
    },
  ];

  const dailyCards: EarnCard[] = [
    {
      status: "ready",
      num: `+${ECONOMY.DAILY_CLAIM}⬡`,
      unit: "per UTC day · resets decay",
      title: "Daily X share",
      body: `Sign in with X, share today's signal on /carrier. Resets the 14-day decay timer. Streak: +${ECONOMY.STREAK_3_BONUS} (3d) / +${ECONOMY.STREAK_7_BONUS} (7d) / +${ECONOMY.STREAK_30_BONUS} (30d).`,
      cta: { label: "CLAIM TODAY", href: "/carrier" },
      accent: "var(--gold)",
    },
    {
      status: "ready",
      num: `+${ECONOMY.MISSION_REWARD}⬡`,
      unit: "rotates per UTC day",
      title: "Daily mission",
      body: "Today's mission card on / and /carrier. Visit a different civ each day, 10-day rotation.",
      cta: { label: "TODAY'S MISSION", href: "/" },
      accent: "var(--gold)",
    },
    {
      status: "ready",
      num: `+${ECONOMY.FRESH_BLOOD_BOUNTY}⬡`,
      unit: "one-time · per wallet",
      title: "Fresh blood",
      body: "First citizen acquisition by a wallet. Auto-credits on next holder tick. Cooldown prevents sybil shuffles.",
      cta: { label: "BUY YOUR FIRST", href: "https://opensea.io/collection/freelons" },
      accent: "#A989C7",
    },
  ];

  const questCards: EarnCard[] = [
    {
      status: "locked",
      num: `+${ECONOMY.CITY_TOURIST_REWARD}⬡`,
      unit: "0 / 10 civilizations",
      title: "City tourist",
      body: "Visit all 10 civilization pages. One-time reward.",
      cta: { label: "START TOUR", href: "/civilizations" },
      accent: "var(--ink-2)",
    },
    {
      status: "locked",
      num: `+${ECONOMY.ARCHIVIST_REWARD}⬡`,
      unit: "0 / 35 honoraries",
      title: "Archivist",
      body: "Open the lore panel for all 35 honorary citizens. The deep dive.",
      cta: { label: "OPEN THE ARCHIVE", href: "/lore" },
      accent: "var(--ink-2)",
    },
    {
      status: "locked",
      num: `+${ECONOMY.HEX_HUNTER_REWARD}⬡`,
      unit: "0 / 5 secrets",
      title: "Hex hunter",
      body: "Find 5 hidden secrets on /secrets. Some are obvious. Some aren't.",
      cta: { label: "HUNT", href: "/secrets" },
      accent: "var(--ink-2)",
    },
    {
      status: "locked",
      num: `+${ECONOMY.DOCTRINE_MASTER_REWARD}⬡`,
      unit: "0 / 10 doctrines",
      title: "Doctrine master",
      body: "Find all 10 hidden doctrine fragments — one on each civ page. Faint italic line near the bottom.",
      cta: { label: "FIND THE FRAGMENTS", href: "/civilizations" },
      accent: "var(--ink-2)",
    },
  ];

  const passiveCards: EarnCard[] = [
    {
      status: "ready",
      num: `+${ECONOMY.PER_CITIZEN_PER_DAY}⬡`,
      unit: `per citizen/day · ${ECONOMY.ACTIVITY_DECAY_DAYS}d decay`,
      title: "Passive holding",
      body: `A baseline pulse. PAUSES after ${ECONOMY.ACTIVITY_DECAY_DAYS} days of zero active action — post to resume. Tier mults: 1×/1.2×/1.5×/2× by balance. +25% same-civ. +${ECONOMY.HONORARY_BONUS_PER_WEEK}/wk per Honorary. +${ECONOMY.ONE_OF_ONE_BONUS_PER_DAY}/day per 1-of-1.`,
      cta: { label: "OPEN MY WALLET", href: "/carrier" },
      accent: "var(--ink-dim)",
    },
    {
      status: "ready",
      num: `+${ECONOMY.LISTING_BOUNTY_PER_DAY}⬡`,
      unit: `per active listing · cap ${ECONOMY.LISTING_BOUNTY_DAILY_CAP}/day`,
      title: "Listing bounty",
      body: "Keep liquidity on the floor. Hex credits while your citizens are actively listed on OpenSea. List-cancel cycling earns nothing.",
      cta: { label: "LIST A CITIZEN ↗", href: "https://opensea.io/collection/freelons" },
      accent: "var(--ink-dim)",
    },
  ];

  type BurnRow = { name: string; cost: number; how: string; href?: string };
  const functional: BurnRow[] = [
    { name: "Naming",            cost: ECONOMY.NAMING_COST,         how: "Give a citizen a permanent display name.",     href: "/citizens" },
    { name: "Civ realign",       cost: ECONOMY.REALIGN_COST,        how: "Move a Common to a different civilization.",  href: "/citizens" },
    { name: "Custom title",      cost: ECONOMY.CUSTOM_TITLE_COST,   how: "Vanity title on your /carrier page.",          href: "/carrier" },
  ];
  const visibility: BurnRow[] = [
    { name: "Boost listing",     cost: ECONOMY.BOOST_LISTING_PER_DAY, how: "Pin your listing at the top of /market for 24h." },
    { name: "Feature citizen",   cost: ECONOMY.FEATURE_CITIZEN_24H,   how: "Hero slot on /civilizations for 24h." },
    { name: "Signal Burst",      cost: ECONOMY.SIGNAL_BURST_COST,     how: "Top-of-feed spotlight on the homepage." },
  ];
  const community: BurnRow[] = [
    { name: "Tithe — Patrons",   cost: ECONOMY.TITHE_MIN,             how: `Burn ${ECONOMY.TITHE_MIN}+ ⬡ → name on /patrons for 7 days.`, href: "/patrons" },
    { name: "Shop",              cost: ECONOMY.SHOP_MIN,              how: `30 artifacts. ${ECONOMY.SHOP_MIN}–${ECONOMY.SHOP_MAX} ⬡.`,     href: "/shop" },
  ];

  function BurnGroup({ title, rows, accent }: { title: string; rows: BurnRow[]; accent: string }) {
    return (
      <div style={{ marginBottom: "var(--s-4)" }}>
        <div className="kicker" style={{ color: accent, marginBottom: 8 }}>⬡ {title}</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r) => (
            <li key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--ink)", letterSpacing: "-0.005em" }}>{r.name}</span>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)" }}>{r.how}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: accent, fontWeight: 600, whiteSpace: "nowrap" }}>{r.cost.toLocaleString()} ⬡</span>
                {r.href && (
                  <Link href={r.href} style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", textDecoration: "none", letterSpacing: "0.18em" }}>
                    GO →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <main className="earn-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,90,77,0.0); }
          50%      { box-shadow: 0 0 0 6px rgba(255,90,77,0.15); }
        }
        .earn-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--s-3); }
        @media (max-width: 640px) {
          .earn-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          padding: "var(--s-7) var(--s-5)",
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(90deg, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 100%), url(/atmos/carrier.webp) center / cover no-repeat",
          border: "1px solid var(--line-2)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ THE LEDGER · TODAY&apos;S MISSION</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.92, margin: "10px 0 14px", letterSpacing: "-0.02em" }}>
          Active carriers<br/>
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>get paid</em>.<br/>
          Lazy holders <em style={{ color: "#FF5A4D", fontStyle: "normal" }}>decay</em>.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", maxWidth: 520, lineHeight: 1.6 }}>
          The city pays in hex. Snipe, sweep, sell, post — the meter runs.
          Sit still for {ECONOMY.ACTIVITY_DECAY_DAYS} days and earnings pause until you do something.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "var(--s-4)" }}>
          <Link href="/dashboard" className="btn btn-primary">
            <span className="ttl">VIEW LIVE SIGNALS →</span>
          </Link>
          <Link href="/carrier" className="btn btn-secondary">
            <span className="ttl">CLAIM TODAY&apos;S {ECONOMY.DAILY_CLAIM} ⬡ →</span>
          </Link>
        </div>
        {live.redSignalCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "var(--s-4)",
              right: "var(--s-4)",
              padding: "8px 12px",
              border: "1px solid #FF5A4D",
              background: "rgba(255,90,77,0.12)",
              borderRadius: 999,
              fontFamily: "var(--mono2)",
              fontSize: 11,
              color: "#FF5A4D",
              letterSpacing: "0.18em",
              fontWeight: 600,
              animation: "pulseGlow 2s ease-in-out infinite",
            }}
          >
            🔴 {live.redSignalCount} RED SIGNAL{live.redSignalCount === 1 ? "" : "S"} LIVE
          </div>
        )}
      </section>

      {/* ── NOW ────────────────────────────────────────────────────── */}
      <BandHero
        image="/atmos/sync.webp"
        kicker="⬡ NOW · TIME-SENSITIVE"
        title="The market is moving"
        blurb="Three actions priced in opportunity. The longer you wait, the smaller the spread."
        accent="#FF5A4D"
      />
      <div className="earn-grid-3">
        {nowCards.map((c) => <MissionCard key={c.title} c={c} />)}
      </div>

      {/* ── DAILY ──────────────────────────────────────────────────── */}
      <BandHero
        image="/atmos/manifesto.webp"
        kicker="⬡ DAILY · RESET THE METER"
        title="One tap, every UTC day"
        blurb={`These reset the ${ECONOMY.ACTIVITY_DECAY_DAYS}-day decay clock and keep your passive earnings alive.`}
        accent="var(--gold)"
      />
      <div className="earn-grid-3">
        {dailyCards.map((c) => <MissionCard key={c.title} c={c} />)}
      </div>

      {/* ── QUESTS ─────────────────────────────────────────────────── */}
      <BandHero
        image="/atmos/rebuild.webp"
        kicker="⬡ QUESTS · ONE-TIME PAYOUTS"
        title="Earn it once, hold it forever"
        blurb="Achievement-style. No farming. No retries. Find them or don't."
        accent="#A989C7"
      />
      <div className="earn-grid-3">
        {questCards.map((c) => <MissionCard key={c.title} c={c} />)}
      </div>

      {/* ── PASSIVE ────────────────────────────────────────────────── */}
      <BandHero
        image="/atmos/not-found.webp"
        kicker="⬡ PASSIVE · THE FLOOR"
        title="A pulse, not a salary"
        blurb={`Deliberately small. The economy rewards action. These tick along underneath whatever else you do — and PAUSE if you go ${ECONOMY.ACTIVITY_DECAY_DAYS} days without an active move.`}
        accent="var(--ink-dim)"
      />
      <div className="earn-grid-3">
        {passiveCards.map((c) => <MissionCard key={c.title} c={c} />)}
      </div>

      {/* ── BURN ───────────────────────────────────────────────────── */}
      <BandHero
        image="/atmos/manifesto.webp"
        kicker="⬡ BURN · WHERE HEX GOES"
        title="Spend the city's credit"
        blurb="Every line is a sink. Some are functional. Some are pure flex. Hex burned never returns."
        accent="#FF5A4D"
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--s-4)" }}>
        <BurnGroup title="FUNCTIONAL"  rows={functional}  accent="var(--gold)" />
        <BurnGroup title="VISIBILITY"  rows={visibility}  accent="#A989C7" />
        <BurnGroup title="COMMUNITY"   rows={community}   accent="#7AB7FF" />
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: "var(--s-7)", padding: "var(--s-5) var(--s-4) 0", borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)", fontFamily: "var(--mono2)" }}>
          The meter only runs while you do. Don&apos;t go cold.
        </p>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/dashboard">
            <span className="ttl">VIEW LIVE SIGNALS →</span>
          </Link>
          <Link className="btn btn-secondary" href="/leaderboard">
            <span className="ttl">LEADERBOARD →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
