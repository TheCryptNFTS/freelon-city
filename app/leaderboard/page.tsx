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
    <main className="leaderboard-page" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad)" }}>
      <span className="kicker">⬡ HEX LEADERBOARD</span>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.94, letterSpacing: "-0.02em", marginTop: "var(--s-3)" }}>
        Who's <em>earned the most</em>
      </h1>
      <p className="lead" style={{ maxWidth: 640, marginTop: "var(--s-3)" }}>
        Top hex earners. Recomputed every 2 minutes from the wallet ledger.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-5)", marginTop: "var(--s-6)" }}>
        <section>
          <h2 className="kicker" style={{ display: "block", marginBottom: "var(--s-3)" }}>⬡ CURRENT BALANCE</h2>
          {byBalance.length === 0 ? (
            <p style={{ color: "var(--ink-dim)", fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.16em" }}>
              No earnings yet. Be the first.
            </p>
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
          <h2 className="kicker" style={{ display: "block", marginBottom: "var(--s-3)" }}>⬡ LIFETIME EARNED</h2>
          {byLifetime.length === 0 ? (
            <p style={{ color: "var(--ink-dim)", fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.16em" }}>
              No earnings yet.
            </p>
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

      <div style={{ marginTop: "var(--s-6)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
        <Link className="btn btn-primary" href="/earn"><span className="ttl">HOW TO EARN →</span></Link>
        <Link className="btn btn-secondary" href="/patrons"><span className="ttl">PATRONS WALL →</span></Link>
      </div>
    </main>
  );
}
