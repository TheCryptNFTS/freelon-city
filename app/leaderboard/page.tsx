import type { Metadata } from "next";
import Link from "next/link";
import { listWalletHexRecords } from "@/lib/wallet-hex-store";
import { MyRank } from "@/components/MyRank";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Leaderboard ⬡",
  description: "Top hex earners — active 7 days, current balance, and lifetime. Live from the city's economic layer.",
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const DAY_MS = 86_400_000;

export default async function LeaderboardPage() {
  const records = await listWalletHexRecords(500);
  const now = Date.now();
  const weekCutoff = now - 7 * DAY_MS;

  // Active 7d = sum of positive events in the last 7 days from each wallet's
  // event ring buffer. This is the "post-v2 economy" view — pre-decay-gate
  // accruals don't dominate, so newcomers can climb fast.
  const active7d = records
    .map((r) => {
      const sum = r.events
        .filter((e) => e.ts >= weekCutoff && e.amount > 0)
        .reduce((s, e) => s + e.amount, 0);
      return { address: r.address, value: sum };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const byBalance = [...records]
    .map((r) => ({ address: r.address, value: r.balance }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const byLifetime = [...records]
    .map((r) => ({ address: r.address, value: r.lifetimeEarned }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  type Row = { address: string; value: number };
  function List({ rows, emptyHook }: { rows: Row[]; emptyHook: string }) {
    if (rows.length === 0) {
      return (
        <ol className="lb-list ghost-list">
          <li><span className="lb-rank">01</span><span className="lb-addr ghost">YOUR WALLET</span><span className="lb-amt ghost">— ⬡</span></li>
          <li><span className="lb-rank">02</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
          <li><span className="lb-rank">03</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
          <li className="ghost-cta">{emptyHook}</li>
        </ol>
      );
    }
    return (
      <ol className="lb-list">
        {rows.map((r, i) => (
          <li key={r.address}>
            <span className="lb-rank">{String(i + 1).padStart(2, "0")}</span>
            <Link href={`/wallet/${r.address}`} className="lb-addr">{shortAddr(r.address)}</Link>
            <span className="lb-amt">{r.value.toLocaleString()} ⬡</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="leaderboard-page">
      <section className="page-hero">
        <span className="kicker">⬡ THE LEADERBOARD</span>
        <h1>Who the city <em>recognizes</em></h1>
        <p className="lead">
          Three windows on the same ledger. <strong style={{ color: "var(--gold)" }}>Active 7d</strong> is the live race —
          pre-economy-v2 accruals don&apos;t count. Recomputed every 2 minutes.
        </p>
      </section>

      <MyRank />

      <div className="lb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gridAutoRows: "1fr", gap: "var(--s-4)" }}>
        <section>
          <h2 className="kicker" style={{ color: "var(--gold)" }}>⬡ ACTIVE · 7 DAYS</h2>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em", marginTop: 4, marginBottom: 12 }}>
            HEX EARNED IN LAST 7 DAYS · THE TRUE RACE
          </p>
          <List rows={active7d} emptyHook="The race is open · be rank 01 today." />
        </section>

        <section>
          <h2 className="kicker">⬡ CURRENT BALANCE</h2>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em", marginTop: 4, marginBottom: 12 }}>
            UNBURNT ⬡ ON HAND
          </p>
          <List rows={byBalance} emptyHook="The wall is blank · Claim rank 01." />
        </section>

        <section>
          <h2 className="kicker">⬡ LIFETIME EARNED</h2>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em", marginTop: 4, marginBottom: 12 }}>
            INCLUDES PRE-V2 ACCRUALS · HISTORICAL
          </p>
          <List rows={byLifetime} emptyHook="The wall is blank · First to stack owns it." />
        </section>
      </div>

      <section className="page-next">
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="page-next-row">
          <Link className="btn btn-primary" href="/dashboard"><span className="ttl">SNIPE A RED SIGNAL →</span></Link>
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">THE LEDGER →</span></Link>
          <Link className="btn btn-secondary" href="/patrons"><span className="ttl">THE PATRONS WALL →</span></Link>
        </div>
      </section>
    </div>
  );
}
