"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type RankBundle = { active7d?: number; balance?: number; lifetime?: number };
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "no-wallet" }
  | { kind: "no-data" }
  | { kind: "ready"; addr: string; balance: number; lifetimeEarned: number; active7d: number; rank: RankBundle };

/**
 * "Your rank" prefill — reads freelon_addr cookie, fetches the wallet's
 * hex record, computes its three leaderboard positions (active 7d /
 * balance / lifetime). Renders a sticky personal card at top of
 * /leaderboard so visitors immediately see where THEY stand.
 */
export function MyRank() {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
    if (!m) { setState({ kind: "no-wallet" }); return; }
    const addr = decodeURIComponent(m[1]);
    setState({ kind: "loading" });
    fetch(`/api/leaderboard/me?addr=${addr}`)
      .then((r) => r.ok ? r.json() : null)
      .then((j: { balance?: number; lifetimeEarned?: number; active7d?: number; rank?: RankBundle } | null) => {
        if (!j) { setState({ kind: "no-data" }); return; }
        setState({
          kind: "ready",
          addr,
          balance: j.balance ?? 0,
          lifetimeEarned: j.lifetimeEarned ?? 0,
          active7d: j.active7d ?? 0,
          rank: j.rank ?? {},
        });
      })
      .catch(() => setState({ kind: "no-data" }));
  }, []);

  if (state.kind === "idle" || state.kind === "loading") return null;
  if (state.kind === "no-wallet") {
    return (
      <section style={{ margin: "var(--s-4) 0", padding: "var(--s-4)", border: "1px dashed var(--line-2)", borderRadius: 12, textAlign: "center" }}>
        <span className="kicker">⬡ YOUR RANK</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", margin: "8px 0 12px" }}>
          Visit your wallet page once to see where you sit on the leaderboard.
        </p>
        <Link href="/sync" className="btn btn-secondary"><span className="ttl">FIND YOUR WALLET →</span></Link>
      </section>
    );
  }
  if (state.kind === "no-data") return null;

  const fmt = (n?: number) => (n && n > 0 ? `#${n}` : "—");
  return (
    <section
      style={{
        margin: "var(--s-4) 0",
        padding: "var(--s-4)",
        border: "1px solid color-mix(in srgb, var(--gold) 27%, transparent)",
        borderRadius: 12,
        background: "linear-gradient(90deg, rgba(200,167,93,0.08) 0%, rgba(0,0,0,0.4) 100%)",
        display: "grid",
        gridTemplateColumns: "1fr repeat(3, auto)",
        gap: "var(--s-3)",
        alignItems: "center",
      }}
    >
      <div>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ YOUR RANK</span>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>
          <code>{state.addr.slice(0, 6)}…{state.addr.slice(-4)}</code>
        </div>
      </div>
      <Cell label="ACTIVE · 7D" rank={fmt(state.rank.active7d)} value={state.active7d} />
      <Cell label="BALANCE"      rank={fmt(state.rank.balance)}   value={state.balance} />
      <Cell label="LIFETIME"     rank={fmt(state.rank.lifetime)}  value={state.lifetimeEarned} />
    </section>
  );
}

function Cell({ label, rank, value }: { label: string; rank: string; value: number }) {
  return (
    <div style={{ textAlign: "right", minWidth: 100 }}>
      <span style={{ display: "block", fontFamily: "var(--mono2)", fontSize: 9, letterSpacing: "0.18em", color: "var(--ink-dim)" }}>{label}</span>
      <span style={{ display: "block", fontFamily: "var(--display)", fontSize: 20, color: "var(--gold)", lineHeight: 1.1 }}>{rank}</span>
      <span style={{ display: "block", fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)" }}>{value.toLocaleString()} ⬡</span>
    </div>
  );
}
