import type { Metadata } from "next";
import Link from "next/link";
import { listWalletHexRecords, type WalletHex } from "@/lib/wallet-hex-store";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Floor Defenders ⬡ · FREELON CITY",
  description:
    "Wallets that held citizens 30+ continuous days without listing or transferring out. The city remembers.",
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

type DefenderRow = {
  address: string;
  totalDefenderHex: number;
  defenderEventCount: number;
  firstDefenderTs: number | null;
  lastDefenderTs: number | null;
  qualifyingCitizens: number;
};

function isDefenderEvent(note: string | undefined): boolean {
  return !!note && /floor defender/i.test(note);
}

function parseCitizenCount(note: string | undefined): number {
  // Notes commonly look like "Floor defender · 3 citizens" or similar. Best-effort parse.
  if (!note) return 0;
  const m = note.match(/(\d+)\s*(?:citizens?|tokens?|held)/i);
  if (m) return Number(m[1]);
  return 0;
}

function buildDefenderRow(rec: WalletHex): DefenderRow | null {
  if (rec.lastDefenderTickDay == null) return null;
  const defenderEvents = rec.events.filter(
    (e) => e.kind === "hold" && isDefenderEvent(e.note),
  );
  if (defenderEvents.length === 0) return null;
  const total = defenderEvents.reduce((s, e) => s + e.amount, 0);
  const tsList = defenderEvents.map((e) => e.ts).filter((t) => t > 0);
  const first = tsList.length ? Math.min(...tsList) : null;
  const last = tsList.length ? Math.max(...tsList) : null;
  // Approximate qualifying citizens: max count parsed from any defender note.
  let qualifying = 0;
  for (const e of defenderEvents) {
    const c = parseCitizenCount(e.note);
    if (c > qualifying) qualifying = c;
  }
  return {
    address: rec.address,
    totalDefenderHex: total,
    defenderEventCount: defenderEvents.length,
    firstDefenderTs: first,
    lastDefenderTs: last,
    qualifyingCitizens: qualifying,
  };
}

function daysBetween(a: number | null, b: number | null): number {
  if (a == null || b == null) return 0;
  const ms = Math.max(0, b - a);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default async function DefendersPage() {
  const records = await listWalletHexRecords(500);
  const rows: DefenderRow[] = [];
  for (const r of records) {
    const row = buildDefenderRow(r);
    if (row) rows.push(row);
  }
  rows.sort((a, b) => b.totalDefenderHex - a.totalDefenderHex);

  return (
    <main className="defenders-page">
      <span className="kicker">⬡ FLOOR DEFENDERS</span>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(48px, 8vw, 96px)",
          lineHeight: 0.94,
          letterSpacing: "-0.02em",
          marginTop: "var(--s-3)",
        }}
      >
        Held <em>through the floor</em>
      </h1>
      <p
        className="lead"
        style={{ maxWidth: 680, marginTop: "var(--s-3)" }}
      >
        Citizens held 30+ continuous days. No transfer out. The city remembers.
      </p>

      <section style={{ marginTop: "var(--s-7)" }}>
        {rows.length === 0 ? (
          <div className="empty-hero">
            <span className="kicker">⬡ NO DEFENDERS YET</span>
            <h2 className="empty-hero-title">The wall is blank · 30 days until the first</h2>
            <p className="empty-hero-sub">Hold a citizen 30+ continuous days. No transfer out. +50⬡/day per qualifying citizen. The city carves the first defender into the wall.</p>
            <ol className="ghost-rows">
              <li><span>01</span><span className="ghost">YOUR WALLET</span><span className="ghost">N citizens</span><span className="ghost">— defender hex</span></li>
              <li><span>02</span><span className="ghost">—</span><span className="ghost">—</span><span className="ghost">—</span></li>
              <li><span>03</span><span className="ghost">—</span><span className="ghost">—</span><span className="ghost">—</span></li>
            </ol>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr auto auto",
                gap: "var(--s-3)",
                padding: "8px 0",
                fontFamily: "var(--mono2)",
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "var(--ink-dim)",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span>#</span>
              <span>WALLET</span>
              <span>QUAL · DAYS</span>
              <span>⬡ EARNED</span>
            </div>
            {rows.map((r, i) => {
              const days = daysBetween(r.firstDefenderTs, r.lastDefenderTs);
              return (
                <div key={r.address} className="defender-row">
                  <span className="id">{String(i + 1).padStart(2, "0")}</span>
                  <Link
                    href={`/wallet/${r.address}`}
                    className="addr"
                    style={{ textDecoration: "none" }}
                  >
                    {shortAddr(r.address)}
                  </Link>
                  <span
                    style={{
                      color: "var(--ink-2)",
                      fontFamily: "var(--mono2)",
                      fontSize: 11,
                      letterSpacing: "0.16em",
                    }}
                  >
                    {r.qualifyingCitizens || "—"} · {days}d
                  </span>
                  <span className="stat">
                    {r.totalDefenderHex.toLocaleString()} ⬡
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div
        style={{
          marginTop: "var(--s-7)",
          display: "flex",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <Link className="btn btn-primary" href="/earn#defender">
          <span className="ttl">BECOME A DEFENDER →</span>
        </Link>
        <Link className="btn btn-secondary" href="/earn">
          <span className="ttl">THE LEDGER →</span>
        </Link>
        <Link className="btn btn-secondary" href="/leaderboard">
          <span className="ttl">THE LEADERBOARD →</span>
        </Link>
        <Link className="btn btn-secondary" href="/graveyard">
          <span className="ttl">THE GRAVEYARD →</span>
        </Link>
      </div>
    </main>
  );
}
