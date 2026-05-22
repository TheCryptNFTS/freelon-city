"use client";
import { useEffect, useState } from "react";
import { StreakBadge } from "./StreakBadge";

type Event = {
  ts: number;
  kind: "hold" | "sweep" | "sweep_streak" | "quest" | "manual";
  amount: number;
  note?: string;
};

type Data = {
  balance: number;
  lifetimeEarned: number;
  lastHolderTickDay: string | null;
  claimStreak?: number;
  tick?: {
    daysCredited: number;
    hexCredited: number;
    tier: string;
    multiplier: number;
    civBonusPct: number;
  };
  defenderTick?: {
    qualifyingTokens: number;
    hexCredited: number;
    daysCredited: number;
  };
  events: Event[];
};

const KIND_LABEL: Record<Event["kind"], string> = {
  hold: "HOLD",
  sweep: "SWEEP",
  sweep_streak: "STREAK",
  quest: "QUEST",
  manual: "MANUAL",
};

const KIND_COLOR: Record<Event["kind"], string> = {
  hold: "#c8aa64",
  sweep: "#5a9a4a",
  sweep_streak: "#e9c984",
  quest: "#4a8acb",
  manual: "#a989c7",
};

function timeAgo(ts: number) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export function HexEarningsLog({ address }: { address: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/wallet/${address}/hex`)
      .then((r) => r.json())
      .then((d: Data) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, [address]);

  if (err) {
    return (
      <div className="hex-log hex-log-empty">
        <span className="kicker">⬡ WALLET HEX</span>
        <span className="hl-empty">SIGNAL LOST · RETRY</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="hex-log hex-log-loading">
        <span className="kicker">⬡ WALLET HEX</span>
        <div className="skeleton-stack">
          <div className="shimmer-row" style={{ height: 56, marginBottom: 12 }} />
          <div className="shimmer-row" />
          <div className="shimmer-row" />
          <div className="shimmer-row" />
        </div>
      </div>
    );
  }

  return (
    <div className="hex-log">
      <div className="hl-head">
        <span className="kicker">⬡ WALLET HEX LEDGER</span>
        <span className="hl-balance">
          {data.balance.toLocaleString()} ⬡
        </span>
        <span className="hl-lifetime">
          lifetime · {data.lifetimeEarned.toLocaleString()} ⬡
        </span>
      </div>

      {data.claimStreak ? (
        <div className="hl-streak">
          <StreakBadge streak={data.claimStreak} />
        </div>
      ) : null}

      {data.tick && data.tick.daysCredited > 0 && (
        <div className="hl-tick">
          <span className="hl-tick-credit">+{data.tick.hexCredited} ⬡</span>{" "}
          for {data.tick.daysCredited} day{data.tick.daysCredited > 1 ? "s" : ""} of holding ·{" "}
          <strong>{data.tick.tier}</strong> tier ({data.tick.multiplier}×)
          {data.tick.civBonusPct ? ` · +${data.tick.civBonusPct}% civ bonus` : ""}
        </div>
      )}

      {/* Forecast — what tomorrow's passive will look like at current rate */}
      {data.tick && data.tick.daysCredited > 0 && data.tick.hexCredited > 0 && (
        <div style={{ padding: "10px 14px", margin: "8px 0 12px", border: "1px dashed var(--line-2)", borderRadius: 8, background: "rgba(200,167,93,0.04)" }}>
          <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
            ⬡ NEXT TICK · FORECAST
          </span>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>
            ~<strong style={{ color: "var(--gold)" }}>+{Math.round(data.tick.hexCredited / data.tick.daysCredited)} ⬡</strong>/day at current rate · stay active to keep the meter flowing
          </div>
        </div>
      )}

      {data.defenderTick && data.defenderTick.qualifyingTokens > 0 && (
        <div className="hl-tick">
          <span className="hl-tick-credit">+{data.defenderTick.hexCredited} ⬡</span>{" "}
          floor defender · {data.defenderTick.qualifyingTokens} citizen{data.defenderTick.qualifyingTokens === 1 ? "" : "s"} held 30d+
        </div>
      )}

      {data.events.length === 0 ? (
        <div className="hl-empty">THE WALL IS BLANK · CLAIM RANK 01 — sweep a citizen, share on X, or walk a civilization.</div>
      ) : (
        <ol className="hl-list">
          {data.events.map((e, i) => (
            <li key={`${e.ts}-${i}`} className="hl-row">
              <span className="hl-kind" style={{ color: KIND_COLOR[e.kind] }}>
                {KIND_LABEL[e.kind]}
              </span>
              <span className="hl-note">{e.note ?? "—"}</span>
              <span className="hl-amount" style={{ color: e.amount < 0 ? "#c54a3a" : KIND_COLOR[e.kind] }}>
                {e.amount > 0 ? "+" : ""}
                {e.amount.toLocaleString()} ⬡
              </span>
              <span className="hl-time">{timeAgo(e.ts)} ago</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
