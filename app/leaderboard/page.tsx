import type { Metadata } from "next";
import Link from "next/link";
import { listWalletHexRecords } from "@/lib/wallet-hex-store";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Leaderboard ⬡ · FREELON CITY",
  description: "Top hex earners by current balance and lifetime earned. Live from the city's economic layer.",
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default async function LeaderboardPage() {
  const records = await listWalletHexRecords(500);
  const byBalance = [...records].sort((a, b) => b.balance - a.balance).slice(0, 50);
  const byLifetime = [...records].sort((a, b) => b.lifetimeEarned - a.lifetimeEarned).slice(0, 50);

  return (
    <main className="leaderboard-page">
      <section className="page-hero">
        <span className="kicker">⬡ THE LEADERBOARD</span>
        <h1>Who the city <em>recognizes</em></h1>
        <p className="lead">
          The top wallets in hex. Recomputed every 2 minutes from the ledger.
        </p>
      </section>

      <div className="lb-grid">
        <section>
          <h2 className="kicker">⬡ CURRENT BALANCE</h2>
          {byBalance.length === 0 ? (
            <ol className="lb-list ghost-list">
              <li><span className="lb-rank">01</span><span className="lb-addr ghost">YOUR WALLET</span><span className="lb-amt ghost">— ⬡</span></li>
              <li><span className="lb-rank">02</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
              <li><span className="lb-rank">03</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
              <li className="ghost-cta">The wall is blank · Claim rank 01.</li>
            </ol>
          ) : (
            <ol className="lb-list">
              {byBalance.map((r, i) => (
                <li key={r.address}>
                  <span className="lb-rank">{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/wallet/${r.address}`} className="lb-addr">{shortAddr(r.address)}</Link>
                  <span className="lb-amt">{r.balance.toLocaleString()} ⬡</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="kicker">⬡ LIFETIME EARNED</h2>
          {byLifetime.length === 0 ? (
            <ol className="lb-list ghost-list">
              <li><span className="lb-rank">01</span><span className="lb-addr ghost">YOUR WALLET</span><span className="lb-amt ghost">— ⬡</span></li>
              <li><span className="lb-rank">02</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
              <li><span className="lb-rank">03</span><span className="lb-addr ghost">—</span><span className="lb-amt ghost">—</span></li>
              <li className="ghost-cta">The wall is blank · First to stack owns it.</li>
            </ol>
          ) : (
            <ol className="lb-list">
              {byLifetime.map((r, i) => (
                <li key={r.address}>
                  <span className="lb-rank">{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/wallet/${r.address}`} className="lb-addr">{shortAddr(r.address)}</Link>
                  <span className="lb-amt">{r.lifetimeEarned.toLocaleString()} ⬡</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="page-next">
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div className="page-next-row">
          <Link className="btn btn-primary" href="/carrier"><span className="ttl">CLIMB THE RANK →</span></Link>
          <Link className="btn btn-secondary" href="/earn"><span className="ttl">THE LEDGER →</span></Link>
          <Link className="btn btn-secondary" href="/patrons"><span className="ttl">THE PATRONS WALL →</span></Link>
        </div>
      </section>
    </main>
  );
}
