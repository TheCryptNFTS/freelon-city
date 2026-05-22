import type { Metadata } from "next";
import Link from "next/link";
import { ECONOMY } from "@/lib/economy-constants";

export const metadata: Metadata = {
  title: "The Ledger ⬡ · FREELON CITY",
  description: "The full ledger of hex — every way the city pays, every way it takes. Active actions earn most. Passive holding is a floor, not a salary.",
};

type Row = {
  kind: "EARN" | "SPEND";
  name: string;
  reward: string;
  how: string;
  notes?: string;
};

const EARN: Row[] = [
  // ── Active actions (this is where most hex flows) ──────────────────
  {
    kind: "EARN",
    name: "Snipe a 🔴 Red Signal",
    reward: `Up to +${ECONOMY.SNIPE_BOUNTY_CAP} ⬡`,
    how: `Buy a listing flagged red on /dashboard (priced ≤ ${ECONOMY.RED_SIGNAL_THRESHOLD * 100}% of floor). Hold ${ECONOMY.SNIPE_HOLD_DAYS} days. Bounty auto-credits.`,
    notes: `Capped at ${ECONOMY.SNIPE_MAX_PER_DAY}/day per wallet. ${ECONOMY.SNIPE_COOLDOWN_HOURS}h cooldown. No self-snipes (own listings excluded).`,
  },
  {
    kind: "EARN",
    name: "Sale share",
    reward: `${ECONOMY.SALE_SHARE_PCT}% of sale ETH (peg ${ECONOMY.HEX_PER_ETH.toLocaleString()} ⬡ = 1 ETH)`,
    how: "Sell a FREELON citizen on OpenSea. Hex auto-credits on your next wallet tick.",
    notes: `Max ${ECONOMY.SALE_SHARE_MAX_PER_24H} sales/24h count. A 0.01 ETH sale ≈ ${Math.round(0.01 * ECONOMY.SALE_SHARE_PCT / 100 * ECONOMY.HEX_PER_ETH)} ⬡.`,
  },
  {
    kind: "EARN",
    name: "Fresh blood bounty",
    reward: `+${ECONOMY.FRESH_BLOOD_BOUNTY} ⬡`,
    how: "One-time payout the first time a wallet acquires any FREELON citizen.",
    notes: "Cooldown deters sybil shuffling. New holders only.",
  },
  {
    kind: "EARN",
    name: "Listing bounty",
    reward: `+${ECONOMY.LISTING_BOUNTY_PER_DAY} ⬡/day per active listing`,
    how: "Keep liquidity on the floor. Hex credits while your citizens are actively listed on OpenSea.",
    notes: `Cap ${ECONOMY.LISTING_BOUNTY_DAILY_CAP} ⬡/day per wallet. List-cancel cycling earns nothing.`,
  },
  {
    kind: "EARN",
    name: "Sweep bounty",
    reward: `+${ECONOMY.SWEEP_BOUNTY} ⬡ per sweep`,
    how: "Buy a FREELON citizen at or near floor. Credited within 30 min by the daily sweep cron.",
    notes: `Daily cap ${ECONOMY.SWEEP_DAILY_CAP} ⬡. +${ECONOMY.SWEEP_STREAK_BONUS} ⬡ streak bonus on ${ECONOMY.SWEEP_STREAK_THRESHOLD}+ sweeps in 24h.`,
  },
  {
    kind: "EARN",
    name: "Daily X share",
    reward: `+${ECONOMY.DAILY_CLAIM} ⬡ (+ streak)`,
    how: "Sign in with X, share the daily signal. Resets the 14-day decay clock.",
    notes: `Once per UTC day. Streak: +${ECONOMY.STREAK_3_BONUS} (3d) / +${ECONOMY.STREAK_7_BONUS} (7d) / +${ECONOMY.STREAK_30_BONUS} (30d). Resets if missed.`,
  },
  {
    kind: "EARN",
    name: "Daily mission",
    reward: `+${ECONOMY.MISSION_REWARD} ⬡`,
    how: "Today's mission card on / and /carrier. Rotates per UTC day.",
  },
  // ── Quests (one-time) ──────────────────────────────────────────────
  {
    kind: "EARN",
    name: "City Tourist quest",
    reward: `+${ECONOMY.CITY_TOURIST_REWARD} ⬡`,
    how: "Visit all 10 civilization pages.",
    notes: "One-time reward.",
  },
  {
    kind: "EARN",
    name: "Archivist quest",
    reward: `+${ECONOMY.ARCHIVIST_REWARD} ⬡`,
    how: "Open the lore panel for all 35 honorary citizens.",
    notes: "One-time reward.",
  },
  {
    kind: "EARN",
    name: "Hex Hunter quest",
    reward: `+${ECONOMY.HEX_HUNTER_REWARD} ⬡`,
    how: "Find 5 hidden secrets on /secrets.",
    notes: "One-time reward.",
  },
  {
    kind: "EARN",
    name: "Doctrine Master quest",
    reward: `+${ECONOMY.DOCTRINE_MASTER_REWARD} ⬡`,
    how: "Find all 10 hidden doctrine fragments — one on each civilization page.",
    notes: "Look near the bottom. Click the faint italic line.",
  },
  // ── Passive (deliberately small — see "decay gate" below) ──────────
  {
    kind: "EARN",
    name: "Passive holding",
    reward: `+${ECONOMY.PER_CITIZEN_PER_DAY} ⬡/citizen/day × tier mult.`,
    how: "A baseline pulse for holders. Earnings PAUSE after 14 days of no active action — post to resume.",
    notes: `Tier: 1=1.0×, 2–5=1.2×, 6–20=1.5×, 21+=2.0×. +25% if all same civ OR ≥1 of every civ. +${ECONOMY.HONORARY_BONUS_PER_WEEK}/wk per Honorary. +${ECONOMY.ONE_OF_ONE_BONUS_PER_DAY}/day per 1-of-1.`,
  },
];

const SPEND: Row[] = [
  {
    kind: "SPEND",
    name: "Tithe — Patrons wall",
    reward: `Min ${ECONOMY.TITHE_MIN} ⬡`,
    how: "Burn hex on /wallet/[addr] tithe form. Your name appears on /patrons for 7 days.",
    notes: "Sorted by amount per civilization.",
  },
  {
    kind: "SPEND",
    name: "Naming",
    reward: `${ECONOMY.NAMING_COST} ⬡`,
    how: "Give a citizen a custom display name. Signature + ownership verified on-chain.",
    notes: `Permanent until overwritten by next owner.`,
  },
  {
    kind: "SPEND",
    name: "Civilization realign",
    reward: `${ECONOMY.REALIGN_COST} ⬡`,
    how: "Move a Common citizen to a different civilization. Rarity-preserving, Common tier only.",
  },
  {
    kind: "SPEND",
    name: "Boost listing on /market",
    reward: `${ECONOMY.BOOST_LISTING_PER_DAY} ⬡/day`,
    how: "Pin your listing at the top of the market feed for 24h.",
  },
  {
    kind: "SPEND",
    name: "Feature citizen 24h",
    reward: `${ECONOMY.FEATURE_CITIZEN_24H} ⬡`,
    how: "Hero slot on /civilizations for the citizen's civ for 24h.",
  },
  {
    kind: "SPEND",
    name: "Signal Burst",
    reward: `${ECONOMY.SIGNAL_BURST_COST} ⬡`,
    how: "Top-of-feed spotlight on the homepage for the next signal cycle.",
  },
  {
    kind: "SPEND",
    name: "Custom carrier title",
    reward: `${ECONOMY.CUSTOM_TITLE_COST} ⬡`,
    how: "Vanity title displayed on your /carrier/[handle] profile.",
  },
  {
    kind: "SPEND",
    name: "Shop items",
    reward: `${ECONOMY.SHOP_MIN}–${ECONOMY.SHOP_MAX} ⬡`,
    how: "30 artifacts at /shop. Property, weapons, clothes, artifacts.",
    notes: "Carrier-handle keyed (older system); migrates to wallet-keyed over time.",
  },
];

function Row({ row }: { row: Row }) {
  const kindColor = row.kind === "EARN" ? "var(--gold)" : "#a989c7";
  return (
    <article className="earn-row" style={{ borderLeft: `3px solid ${kindColor}` }}>
      <div className="earn-row-head">
        <span className="earn-kind" style={{ color: kindColor }}>{row.kind}</span>
        <span className="earn-name">{row.name}</span>
        <span className="earn-reward">{row.reward}</span>
      </div>
      <p className="earn-how">{row.how}</p>
      {row.notes && <p className="earn-notes">{row.notes}</p>}
    </article>
  );
}

export default function EarnPage() {
  return (
    <main className="earn-page">
      <section className="page-hero">
        <span className="kicker">⬡ THE LEDGER · EARN + BURN</span>
        <h1>Every way the city <em>pays</em></h1>
        <p className="lead">
          Hex is the city&apos;s internal credit. Active carriers earn most of it.
          Passive holders get a baseline pulse — and it pauses after {ECONOMY.ACTIVITY_DECAY_DAYS} days
          of no action. Post, snipe, sweep, or sell to keep the meter alive.
        </p>
      </section>

      <section className="earn-section">
        <h2 className="kicker">⬡ EARN — {EARN.length} LINES</h2>
        <div className="earn-list">
          {EARN.map((r) => <Row key={r.name} row={r} />)}
        </div>
      </section>

      <section className="earn-section">
        <h2 className="kicker" style={{ color: "#a989c7" }}>⬡ BURN — {SPEND.length} LINES</h2>
        <div className="earn-list">
          {SPEND.map((r) => <Row key={r.name} row={r} />)}
        </div>
      </section>

      <section className="page-next">
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="page-next-row page-next-row-grid">
          <Link className="btn btn-primary" href="/carrier">
            <span className="ttl">CLAIM YOUR HEX →</span>
          </Link>
          <Link className="btn btn-secondary" href="/patrons">
            <span className="ttl">THE PATRONS WALL →</span>
          </Link>
          <Link className="btn btn-secondary" href="/leaderboard">
            <span className="ttl">THE LEADERBOARD →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
