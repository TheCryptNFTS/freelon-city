"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type CivBreakdown = { slug: string; name: string; color: string; count: number };
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "no-wallet" }
  | { kind: "no-citizens" }
  | { kind: "ready"; breakdown: CivBreakdown[]; balance: number };

/**
 * Personal-civ panel on /civ-wars. Reads viewer wallet from the
 * freelon_addr cookie (set on wallet page visits) and fetches their
 * civ holdings via the existing wallet endpoint to show "your citizens
 * in this race" — turns the page from a spectator sport into a
 * personal scoreboard.
 */
export function MyCivStandings() {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
    if (!m) { setState({ kind: "no-wallet" }); return; }
    const addr = decodeURIComponent(m[1]);
    setState({ kind: "loading" });
    fetch(`/api/wallet/${addr}/civs`)
      .then((r) => r.ok ? r.json() : null)
      .then((j: { breakdown?: CivBreakdown[]; balance?: number } | null) => {
        if (!j || !j.breakdown || j.breakdown.length === 0) {
          setState({ kind: "no-citizens" });
          return;
        }
        setState({ kind: "ready", breakdown: j.breakdown, balance: j.balance ?? 0 });
      })
      .catch(() => setState({ kind: "no-wallet" }));
  }, []);

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <section style={{ padding: "var(--s-4)", border: "1px dashed var(--line-2)", borderRadius: 14, margin: "var(--s-5) 0", textAlign: "center" }}>
        <span className="kicker" style={{ color: "var(--ink-dim)" }}>⬡ YOUR SIDE OF THE RACE</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", marginTop: 8 }}>Reading your civ allocation...</p>
      </section>
    );
  }
  if (state.kind === "no-wallet") {
    return (
      <section style={{ padding: "var(--s-4)", border: "1px dashed var(--line-2)", borderRadius: 14, margin: "var(--s-5) 0", textAlign: "center" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ YOUR SIDE OF THE RACE</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", margin: "8px 0 14px" }}>
          Visit your wallet page once to see which civs you&apos;re backing.
        </p>
        <Link href="/sync" className="btn btn-secondary"><span className="ttl">FIND YOUR WALLET →</span></Link>
      </section>
    );
  }
  if (state.kind === "no-citizens") {
    return (
      <section style={{ padding: "var(--s-4)", border: "1px dashed var(--line-2)", borderRadius: 14, margin: "var(--s-5) 0", textAlign: "center" }}>
        <span className="kicker" style={{ color: "#FF8A4D" }}>⬡ NO CITIZENS YET</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", margin: "8px 0 14px" }}>
          You can&apos;t play the race without a citizen. Pick a civ, grab one cheap.
        </p>
        <Link href="/civilizations" className="btn btn-primary"><span className="ttl">PICK A CIV →</span></Link>
      </section>
    );
  }

  // Ready state: show breakdown bars + top civ pre-loaded as flexible pick
  const total = state.breakdown.reduce((s, c) => s + c.count, 0);
  const topCiv = state.breakdown[0];

  return (
    <section
      style={{
        padding: "var(--s-5)",
        border: `1px solid ${topCiv.color}66`,
        borderRadius: 14,
        margin: "var(--s-5) 0",
        background: `linear-gradient(180deg, ${topCiv.color}10 0%, rgba(0,0,0,0.4) 100%)`,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <span className="kicker" style={{ color: topCiv.color }}>⬡ YOUR SIDE OF THE RACE</span>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em" }}>
          {state.balance} CITIZEN{state.balance === 1 ? "" : "S"} HELD
        </span>
      </header>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>
        You&apos;re mostly backing <strong style={{ color: topCiv.color }}>{topCiv.name}</strong>
        {" "}({Math.round((topCiv.count / total) * 100)}%). If they win the week, your hex earnings get +10% next cycle.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {state.breakdown.map((c) => {
          const pct = total > 0 ? (c.count / total) * 100 : 0;
          return (
            <li key={c.slug} style={{ display: "grid", gridTemplateColumns: "1fr 80px 50px", alignItems: "center", gap: 12 }}>
              <Link href={`/civilizations/${c.slug}`} style={{ fontFamily: "var(--display)", fontSize: 13, color: c.color, textDecoration: "none" }}>{c.name}</Link>
              <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: c.color }} />
              </div>
              <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", textAlign: "right" }}>{c.count} ({pct.toFixed(0)}%)</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
