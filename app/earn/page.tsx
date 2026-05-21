import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Earn ⬡ · FREELON CITY",
  description: "Every way to earn hex points in FREELON CITY — passive holding, sweeps, quests, daily share, referrals, tithes.",
};

type Row = {
  kind: "EARN" | "SPEND";
  name: string;
  reward: string;
  how: string;
  notes?: string;
};

const EARN: Row[] = [
  {
    kind: "EARN",
    name: "Passive holding",
    reward: "+1 ⬡/citizen/day × tier mult.",
    how: "Hold any FREELON citizen. Tick fires when you view /wallet/[your-addr].",
    notes: "Tier: 1=1.0×, 2–5=1.2×, 6–20=1.5×, 21+=2.0×. +25% if all same civ OR ≥1 of every civ. +50/wk per Honorary. +200/day per 1-of-1.",
  },
  {
    kind: "EARN",
    name: "Floor defender",
    reward: "+50 ⬡/citizen/day",
    how: "Hold any citizen for 30+ consecutive days (no transfer out).",
    notes: "Verified via OpenSea transfer history. Caps catch-up at 30 days.",
  },
  {
    kind: "EARN",
    name: "Sweep bounty",
    reward: "+25 ⬡ per sweep",
    how: "Buy a FREELON citizen on OpenSea. Cron credits you within 30 min.",
    notes: "Daily cap 250 ⬡. +100 ⬡ streak bonus on 3+ sweeps in 24h.",
  },
  {
    kind: "EARN",
    name: "Daily X share",
    reward: "+10 ⬡",
    how: "Sign in with X, share the daily signal on /carrier.",
    notes: "Once per UTC day. Wallet-bound, can't be farmed.",
  },
  {
    kind: "EARN",
    name: "Streak milestones",
    reward: "+25 / +100 / +500 ⬡",
    how: "3, 7, or 30 consecutive days of daily X share claims.",
    notes: "Resets to 0 if you miss a day.",
  },
  {
    kind: "EARN",
    name: "Daily mission",
    reward: "+5 ⬡",
    how: "Today's mission card on / and /carrier. Rotates per UTC day.",
    notes: "Visit a different civ each day. 10-day rotation.",
  },
  {
    kind: "EARN",
    name: "City Tourist quest",
    reward: "+25 ⬡",
    how: "Visit all 10 civilization pages.",
    notes: "One-time reward.",
  },
  {
    kind: "EARN",
    name: "Archivist quest",
    reward: "+100 ⬡",
    how: "Open the lore panel for all 35 honorary citizens.",
    notes: "One-time reward.",
  },
  {
    kind: "EARN",
    name: "Hex Hunter quest",
    reward: "+75 ⬡",
    how: "Find 5 hidden secrets on /secrets.",
    notes: "One-time reward.",
  },
  {
    kind: "EARN",
    name: "Doctrine Master quest",
    reward: "+500 ⬡",
    how: "Find all 10 hidden doctrine fragments — one on each civilization page.",
    notes: "Look near the bottom. Click the faint italic line.",
  },
  {
    kind: "EARN",
    name: "Referral",
    reward: "+50 ⬡ referrer · +25 ⬡ joiner",
    how: "Share your /sync?r=<your-handle> link. New X-verified joiner credits both.",
    notes: "Tracked via HttpOnly cookie set on /sync, bound on X verification.",
  },
];

const SPEND: Row[] = [
  {
    kind: "SPEND",
    name: "Tithe — Patrons wall",
    reward: "Min 100 ⬡",
    how: "Burn hex on /wallet/[addr] tithe form. Your name appears on /patrons for 7 days.",
    notes: "Sorted by amount per civilization.",
  },
  {
    kind: "SPEND",
    name: "Shop items",
    reward: "250–5000 ⬡",
    how: "30 artifacts at /shop. Property, weapons, clothes, artifacts.",
    notes: "Carrier-handle keyed (older system); migrates to wallet-keyed over time.",
  },
  {
    kind: "SPEND",
    name: "Civilization realign",
    reward: "500 ⬡",
    how: "Move a Common citizen to a different civilization.",
    notes: "Rarity-preserving. Common tier only.",
  },
  {
    kind: "SPEND",
    name: "Naming",
    reward: "100 ⬡",
    how: "Give a procedural citizen a custom display name.",
    notes: "Signature verified, ownership checked on-chain.",
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
    <main className="earn-page" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad)" }}>
      <span className="kicker">⬡ ECONOMY · EARN + SPEND</span>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.94, letterSpacing: "-0.02em", marginTop: "var(--s-3)" }}>
        Every way the city <em>pays.</em>
      </h1>
      <p className="lead" style={{ maxWidth: 680, marginTop: "var(--s-3)" }}>
        Hex points are the city's internal credit. You earn them by participating,
        spend them on status. They never leave the site — no token, no taxes, no rug.
      </p>

      <section style={{ marginTop: "var(--s-6)" }}>
        <h2 className="kicker">⬡ EARN — {EARN.length} WAYS</h2>
        <div className="earn-list" style={{ display: "grid", gap: "var(--s-3)", marginTop: "var(--s-3)" }}>
          {EARN.map((r) => <Row key={r.name} row={r} />)}
        </div>
      </section>

      <section style={{ marginTop: "var(--s-6)" }}>
        <h2 className="kicker" style={{ color: "#a989c7" }}>⬡ SPEND — {SPEND.length} WAYS</h2>
        <div className="earn-list" style={{ display: "grid", gap: "var(--s-3)", marginTop: "var(--s-3)" }}>
          {SPEND.map((r) => <Row key={r.name} row={r} />)}
        </div>
      </section>

      <section style={{ marginTop: "var(--s-6)", display: "grid", gap: "var(--s-3)", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <Link className="btn btn-primary" href="/carrier">
          <span className="ttl">START EARNING →</span>
        </Link>
        <Link className="btn btn-secondary" href="/patrons">
          <span className="ttl">SEE THE PATRONS →</span>
        </Link>
        <Link className="btn btn-secondary" href="/leaderboard">
          <span className="ttl">LEADERBOARD →</span>
        </Link>
      </section>
    </main>
  );
}
