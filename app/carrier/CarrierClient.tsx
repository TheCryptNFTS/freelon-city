"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CarrierState, loadCarrier, initCarrier, relay, tickDecay, tier, claimDaily, canClaimToday } from "@/lib/carrier";
import { CIVILIZATIONS } from "@/lib/constants";
import { useHolder } from "@/lib/useHolder";
import { getDailySignal } from "@/lib/daily-signal";
import { AllDoctrinesBadge } from "@/components/AllDoctrinesBadge";

export function CarrierClient() {
  const [state, setState] = useState<CarrierState | null>(null);
  const [input, setInput] = useState("");
  const [shared, setShared] = useState(false);
  const holder = useHolder();

  useEffect(() => {
    const cur = loadCarrier();
    if (cur) setState(tickDecay(cur));
  }, []);

  function onInit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const next = initCarrier(input.trim());
    setState(next);
    // Sync to server so unlock API + public profile have the record.
    fetch(`/api/carrier/${encodeURIComponent(next.handle)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "init" }),
      keepalive: true,
    }).catch(() => {});
  }

  function onRelay() {
    const next = relay();
    if (next) {
      setState(next);
      // Best-effort server sync so the public profile reflects the relay.
      fetch(`/api/carrier/${encodeURIComponent(next.handle)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "relay" }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  function onReset() {
    if (typeof window !== "undefined") localStorage.removeItem("freelon::carrier::v1");
    setState(null);
    setInput("");
  }

  if (!state) {
    return (
      <section className="carrier-init">
        <form onSubmit={onInit} className="carrier-form">
          <label className="kicker">CLAIM YOUR CARRIER HANDLE</label>
          <input
            type="text" maxLength={32} placeholder="@yourhandle"
            value={input} onChange={(e) => setInput(e.target.value)} required
          />
          <button className="btn btn-gold" type="submit">
            <span className="ttl">BECOME A CARRIER <span className="ar">→</span></span>
          </button>
        </form>
      </section>
    );
  }

  const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[state.civilization];
  const t = tier(state.rank);
  const profileUrl = `freeloncity.com/carrier/${state.handle}`;
  const tweet = `I'm a ${t.name} of FREELON CITY.\n\nCivilization: ${civ?.name}\nRank: ${state.rank} / 100\nStreak: ${state.streak}d\nTotal relays: ${state.totalRelays}\n\nThe signal moves through us.\n${profileUrl}`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  const today = new Date();
  const sig = getDailySignal(today);
  const sigCiv = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[sig.from];
  const dailyTweet = `⬡ DAILY SIGNAL — ${today.toISOString().slice(0,10)}\n\n"${sig.line}"\n\n— ${sigCiv?.name ?? sig.from}\n\nI claimed +10 ⬡ — join the city:\nfreeloncity.com/daily`;
  const dailyIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(dailyTweet)}`;
  const claimable = canClaimToday();

  return (
    <section className="carrier-dash" style={{ "--civ": civ?.color || "var(--gold)" } as React.CSSProperties}>
      {holder.isHolder && holder.balance !== null && (
        <div className="holder-flex" style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">⬡ VERIFIED HOLDER</span>
          <span className="holder-count">{holder.balance} CITIZEN{holder.balance !== 1 ? "S" : ""}</span>
          <span className="holder-addr">{holder.address?.slice(0, 6)}…{holder.address?.slice(-4)}</span>
        </div>
      )}
      {state && (
        <div className="daily-claim-card" style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">⬡ DAILY CLAIM</span>
          <h3>{claimable ? "Today's signal is unclaimed." : "Claimed today."}</h3>
          <p>Share today's signal on X, then claim +10 ⬡.</p>
          <div className="claim-flow">
            <a className="btn" href={dailyIntent} target="_blank" rel="noreferrer" onClick={() => setShared(true)}>
              <span className="ttl">1. SHARE ON X →</span>
            </a>
            <button className="btn btn-gold" disabled={!shared || !claimable} onClick={() => {
              const next = claimDaily();
              if (next) setState(next);
            }}>
              <span className="ttl">2. CLAIM +10 ⬡ →</span>
            </button>
          </div>
        </div>
      )}
      <div className="rank-card">
        <div className="rank-meta">
          <span className="kicker">CARRIER · @{state.handle}</span>
          <Link className="civ-link" href={`/civilizations/${state.civilization}`} style={{ color: civ?.color }}>
            {civ?.name?.toUpperCase()}
          </Link>
        </div>
        <div className="tier-band" style={{ color: t.color, borderColor: t.color }}>{t.name}</div>
        <div className="rank-bar">
          <div className="rank-fill" style={{ width: `${state.rank}%`, background: t.color }} />
          <span className="rank-num">{state.rank} / 100</span>
        </div>
        <div className="rank-stats">
          <div><dt>STREAK</dt><dd>{state.streak}d</dd></div>
          <div><dt>RELAYS</dt><dd>{state.totalRelays}</dd></div>
          <div><dt>HEX POINTS</dt><dd className="hex-pts">{state.hexPoints ?? 0} ⬡</dd></div>
          <div><dt>LIFETIME EARNED</dt><dd>{state.totalEarned ?? 0}</dd></div>
        </div>
        <div className="points-rules">
          <span className="kicker">⬡ EARN</span>
          <div className="pr-grid">
            <span>+10</span><span>per relay</span>
            <span>+5</span><span>3-day streak</span>
            <span>+10</span><span>7-day streak</span>
            <span>+25</span><span>30-day streak</span>
            <span>+50</span><span>reach BEARER tier</span>
          </div>
          <span className="kicker" style={{ marginTop: 12, display: "block" }}>⬡ SPEND</span>
          <div className="pr-grid">
            <span>25</span><span>unlock procedural citizen lore</span>
            <span>100</span><span>unlock honorary / 1-of-1 lore</span>
            <span>50</span><span>gift unlock for any citizen</span>
          </div>
        </div>
        <AllDoctrinesBadge />
        <div className="rank-actions">
          <a className="btn btn-gold" href={intent} target="_blank" rel="noreferrer" onClick={onRelay}>
            <span className="lbl">+12 RANK</span>
            <span className="ttl">RELAY ON X <span className="ar">→</span></span>
          </a>
          <a className="btn" href={`/carrier/${state.handle}`}>
            <span className="ttl">VIEW PUBLIC PROFILE →</span>
          </a>
          <button className="btn" onClick={onReset} type="button">
            <span className="ttl">RESET CARRIER</span>
          </button>
        </div>
      </div>
      <div className="tier-ladder">
        <h3>RANK LADDER</h3>
        {[
          { lo: 80, name: "BEARER",  desc: "You move the signal." },
          { lo: 55, name: "RELAY",   desc: "You echo it cleanly." },
          { lo: 30, name: "CARRIER", desc: "You receive consistently." },
          { lo: 10, name: "ECHO",    desc: "You were here. Recently." },
          { lo: 0,  name: "DARK",    desc: "The signal does not reach you." },
        ].map((row) => (
          <div key={row.name} className={`ladder-row ${state.rank >= row.lo ? "reached" : "locked"}`}>
            <span className="lvl">{row.lo}+</span>
            <span className="lvl-name">{row.name}</span>
            <span className="lvl-desc">{row.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
