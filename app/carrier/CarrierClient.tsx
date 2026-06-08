"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CarrierState, loadCarrier, initCarrier, relay, tickDecay, tier, claimDaily, canClaimToday, listKnownCarrierHandles, setActiveCarrierHandle } from "@/lib/carrier";
import { CIVILIZATIONS } from "@/lib/constants";
import { useHolder } from "@/lib/useHolder";
import { getDailySignal } from "@/lib/daily-signal";
import { AllDoctrinesBadge } from "@/components/AllDoctrinesBadge";
import { MyInvites } from "@/components/MyInvites";
import { DailyMission } from "@/components/DailyMission";
import { cityNotice } from "@/lib/city-notice";
import { CANON } from "@/lib/canon";
import { StreakBadge } from "@/components/StreakBadge";
import { useViewerAddr } from "@/lib/use-viewer";
import { NotificationInbox } from "@/components/NotificationInbox";

export function CarrierClient() {
  const viewer = useViewerAddr();
  const [state, setState] = useState<CarrierState | null>(null);
  const [input, setInput] = useState("");
  const [shared, setShared] = useState(false);
  const [xVerified, setXVerified] = useState<string | null>(null);
  const [xError, setXError] = useState<string | null>(null);
  const holder = useHolder();

  useEffect(() => {
    const cur = loadCarrier();
    if (cur) setState(tickDecay(cur));

    // Read X OAuth callback params + persisted verification.
    const url = new URL(window.location.href);
    const verified = url.searchParams.get("x_verified");
    const err = url.searchParams.get("x_error");
    if (err) setXError(err);

    if (verified) {
      setXVerified(verified);
      try { localStorage.setItem("freelon::x_verified::v1", verified); } catch {}
      // If no carrier yet, auto-init with the verified handle
      if (!cur) {
        const next = initCarrier(verified);
        setState(next);
        fetch(`/api/carrier/${encodeURIComponent(next.handle)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "init" }),
          keepalive: true,
        }).catch(() => {});
      }
      // Clean URL
      url.searchParams.delete("x_verified");
      url.searchParams.delete("x_error");
      window.history.replaceState({}, "", url.toString());
    } else {
      try {
        const cached = localStorage.getItem("freelon::x_verified::v1");
        if (cached) setXVerified(cached);
      } catch {}
    }
  }, []);

  // Confirm the verification with the server. CRITICAL: the start flow binds
  // by WALLET when one is connected (see xVerifyHref / the "BIND TO 0x…" CTA),
  // so a holder's verification is stored under the wallet key — NOT the handle
  // key. Confirming by handle alone (the old behaviour) missed every
  // wallet-bound holder, so on a return visit / in-app browser with no
  // localStorage cache they read as unverified and got re-prompted to sign in
  // = the "loops back to login for some" report. Confirm with the same bind
  // precedence the start flow used (wallet first — which also lets /me's signed
  // session fallback match), then fall back to the ?handle= path, which keys
  // off HANDLE_KEY and resolves regardless of how the record was bound.
  useEffect(() => {
    const wallet = viewer.addr || holder.address;
    const handle = state?.handle;
    if (!wallet && !handle) return;
    let cancelled = false;
    (async () => {
      const tryFetch = async (qs: string): Promise<string | null> => {
        try {
          const r = await fetch(`/api/x/me?${qs}`);
          const j = (await r.json()) as { verification?: { xHandle?: string } | null };
          return j.verification?.xHandle ?? null;
        } catch {
          return null;
        }
      };
      let found: string | null = null;
      if (wallet) found = await tryFetch(`bind=${encodeURIComponent(wallet)}`);
      if (!found && handle) found = await tryFetch(`handle=${encodeURIComponent(handle)}`);
      if (!cancelled && found) setXVerified(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.handle, viewer.addr, holder.address]);

  // Prefer the connected wallet as the X bind — that's what every
  // wallet-scoped endpoint (claim, tithe, watchlist, name) requires.
  // Falls back to the handle path so users without a wallet still can
  // claim their /carrier handle, just without wallet-bound earning.
  const xVerifyHref = (handle: string, wallet?: string | null) =>
    wallet
      ? `/api/x/start?bind=${encodeURIComponent(wallet)}`
      : `/api/x/start?bind=${encodeURIComponent(handle)}`;

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
    const seedHandle = input.trim().replace(/^@/, "") || `temp_${Date.now()}`;
    return (
      <section className="carrier-init">
        <form onSubmit={onInit} className="carrier-form">
          <label className="kicker">CLAIM YOUR CARRIER HANDLE</label>
          <input
            type="text" maxLength={32} placeholder="@yourhandle"
            value={input} onChange={(e) => setInput(e.target.value)} required
          />
          <button className="btn btn-primary" type="submit">
            <span className="ttl">BECOME A CARRIER <span className="ar">→</span></span>
          </button>
        </form>
        <div className="x-signin-row" style={{ marginTop: 20 }}>
          <span className="x-or">— OR · VERIFIED PATH —</span>
          {viewer.addr ? (
            <a className="btn btn-secondary btn-sm" href={xVerifyHref(seedHandle, viewer.addr)}>
              <span className="ttl">SIGN IN WITH X · BIND TO {viewer.addr.slice(0, 6)}…{viewer.addr.slice(-4)} ↗</span>
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => {
                  document.querySelector<HTMLButtonElement>(".wallet-connect button")?.focus();
                }, 400);
              }}
              style={{ opacity: 0.65 }}
            >
              <span className="ttl">CONNECT WALLET FIRST →</span>
            </button>
          )}
        </div>
        {viewer.ready && !viewer.addr && (
          <p style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.05em", lineHeight: 1.6, marginTop: 8, maxWidth: 420 }}>
            ⬡ Connect your wallet first so the X session binds to it. Without that bind,
            tithes / claims / names will reject. Carrier-only path still works for streak-tracking.
          </p>
        )}
        {xError && (
          <div className="x-err" style={{ padding: "12px 14px", border: "1px solid #FF5A4D55", background: "rgba(255,90,77,0.08)", borderRadius: 10, fontFamily: "var(--mono2)", fontSize: 12, color: "#FF5A4D", lineHeight: 1.6 }}>
            <strong>X SIGN-IN FAILED · {xError.toUpperCase()}</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--ink-2)" }}>
              {xError === "state_mismatch" && (<li>Browser likely blocked third-party cookies. Try Brave / Firefox / Chrome (not Safari).</li>)}
              {xError === "missing_cookies" && (<li><strong>Most common cause: you&apos;re in your wallet&apos;s in-app browser (MetaMask / Rainbow).</strong> Those don&apos;t carry the sign-in cookies through X. Open <strong>freeloncity.com in Safari, Chrome, or Brave</strong> directly and link X there — you don&apos;t need your wallet connected just to link X.</li>)}
              {xError === "not_configured" && (<li>The site's X OAuth keys aren't loaded yet. Tell @freeloncity if this persists.</li>)}
              {xError.startsWith("token_") && (<li>X rejected the OAuth handshake. Confirm your X account isn't locked / suspended.</li>)}
              {xError === "user_fetch" && (<li>X API hiccup. Try again in 30 seconds.</li>)}
              {xError === "bad_user" && (<li>X returned an unexpected response. Try signing out of X first, then retry.</li>)}
              {!["state_mismatch","missing_cookies","not_configured","user_fetch","bad_user"].includes(xError) && !xError.startsWith("token_") && (<li>Unrecognized error. Try a different browser (Brave / Firefox) or retry in a minute.</li>)}
              <li>If using Safari → MetaMask isn&apos;t supported. Switch to Brave / Firefox / Chrome.</li>
              <li>Or use a handle directly without X verification (limited features).</li>
            </ul>
            <button
              onClick={() => setXError(null)}
              style={{ marginTop: 8, background: "transparent", border: "1px solid #FF5A4D", color: "#FF5A4D", padding: "4px 10px", borderRadius: 6, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.2em", cursor: "pointer" }}
            >
              DISMISS
            </button>
          </div>
        )}
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
      {/* Phase 3: DAILY CLAIM FIRST. The single highest-value action on
          this page is "claim today's hex." It now lands above the
          inbox / mission / handle switcher so a returning carrier
          completes the loop in one scroll. */}
      {state && (
        <div className="daily-claim-card" style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">⬡ DAILY CLAIM</span>
          <h3>{claimable ? "Today's signal is unclaimed." : "Signal locked · Claimed today."}</h3>
          {xVerified ? (
            <p>
              X verified as <strong>@{xVerified}</strong>. Share today's signal, then claim +10 ⬡.
            </p>
          ) : (
            <p>
              Verify your X to claim. Stops anyone else claiming on your handle.
            </p>
          )}
          <div className="claim-flow">
            {!xVerified && (
              <a className="btn btn-primary" href={xVerifyHref(state.handle)}>
                <span className="ttl">VERIFY WITH X →</span>
              </a>
            )}
            {xVerified && (
              <>
                <a className="btn btn-secondary" href={dailyIntent} target="_blank" rel="noreferrer" onClick={() => setShared(true)}>
                  <span className="ttl">1. SHARE ON X →</span>
                </a>
                <button className="btn btn-primary" disabled={!shared || !claimable} onClick={async () => {
                  // 1. Local UI feedback — update carrier hex (handle-scoped,
                  //    localStorage). This is the historical behaviour and the
                  //    user expects the local counter to bump immediately.
                  const next = claimDaily();
                  if (next) setState(next);

                  // 2. THE REAL CREDIT — POST /api/claim so the WALLET hex
                  //    ledger gets +10 (the balance shown on /wallet, /numbers,
                  //    leaderboard, transmissions burn checks). Requires the
                  //    connected wallet to have a signed X session bound to it.
                  //
                  //    Before today, the carrier claim only updated localStorage,
                  //    so users who posted + claimed never saw their wallet hex
                  //    change. Discord bug 2026-05-24 (@Lady Magic): "I just did
                  //    4 posts and swept one today and have not received any
                  //    credit for it" — root cause was here.
                  const wallet = viewer.addr || holder.address;
                  if (wallet) {
                    try {
                      const r = await fetch("/api/claim", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ addr: wallet }),
                      });
                      if (r.ok) {
                        const j = await r.json() as { awarded?: number; streak?: number; streakBonus?: number };
                        const total = (j.awarded || 0) + (j.streakBonus || 0);
                        cityNotice({
                          title: CANON.HEX_RESTORED,
                          body: j.streakBonus
                            ? `Day ${j.streak} streak · +${j.streakBonus} ⬡ bonus`
                            : "Wallet hex credited · the meter holds.",
                          delta: `+${total} ⬡`,
                        });
                      } else if (r.status === 401) {
                        cityNotice({
                          title: "SIGN IN WITH X",
                          body: "Carrier hex credited, but your X session isn't bound to this wallet — wallet hex needs that to credit.",
                          delta: "+10 ⬡ local",
                        });
                      } else if (r.status === 409) {
                        // Already claimed today — local +10 still applied to UI
                        cityNotice({
                          title: "ALREADY CLAIMED",
                          body: "You've already claimed today on the wallet ledger.",
                          delta: "0 ⬡",
                        });
                      } else {
                        cityNotice({
                          title: CANON.HEX_RESTORED,
                          body: "Daily signal claimed · the meter holds.",
                          delta: "+10 ⬡",
                        });
                      }
                    } catch {
                      cityNotice({
                        title: CANON.HEX_RESTORED,
                        body: "Daily signal claimed locally — couldn't reach the wallet ledger.",
                        delta: "+10 ⬡",
                      });
                    }
                  } else {
                    cityNotice({
                      title: "CONNECT WALLET",
                      body: "Carrier hex credited locally. Connect a wallet to mirror it onto your wallet ledger.",
                      delta: "+10 ⬡ local",
                    });
                  }
                }}>
                  <span className="ttl">2. CLAIM +10 ⬡ →</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Phase 3 reorder: inbox + mission + handle switcher + holder
          banner all come AFTER the daily claim card now. */}
      <div style={{ gridColumn: "1 / -1" }}>
        <NotificationInbox />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <DailyMission />
      </div>
      <HandleSwitcher current={state.handle} onSwitch={(h) => {
        setActiveCarrierHandle(h);
        const loaded = loadCarrier(h);
        if (loaded) setState(tickDecay(loaded));
      }} />
      {holder.isHolder && holder.balance !== null && (
        <div className="holder-flex" style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">⬡ VERIFIED HOLDER</span>
          <span className="holder-count">{holder.balance} CITIZEN{holder.balance !== 1 ? "S" : ""}</span>
          <span className="holder-addr">{holder.address?.slice(0, 6)}…{holder.address?.slice(-4)}</span>
        </div>
      )}
      {state && <MyInvites handle={state.handle} />}
      <div className="rank-card">
        <div className="rank-meta">
          <span className="kicker">CARRIER · @{state.handle}</span>
          <Link className="civ-link" href={`/civilizations/${state.civilization}`} style={{ color: civ?.color }}>
            {civ?.name?.toUpperCase()}
          </Link>
        </div>
        {state.streak > 0 && (
          <div style={{ marginTop: 8 }}>
            <StreakBadge streak={state.streak} />
          </div>
        )}
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
          <a className="btn btn-primary" href={intent} target="_blank" rel="noreferrer" onClick={onRelay}>
            <span className="lbl">+12 RANK</span>
            <span className="ttl">RELAY ON X <span className="ar">→</span></span>
          </a>
          <a className="btn btn-secondary" href={`/carrier/${state.handle}`}>
            <span className="ttl">VIEW PUBLIC PROFILE →</span>
          </a>
          <button className="btn btn-ghost" onClick={onReset} type="button">
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

/** Per-browser handle switcher. Only renders when ≥2 carriers exist
 *  in localStorage — invisible for single-handle users. */
function HandleSwitcher({ current, onSwitch }: { current: string; onSwitch: (h: string) => void }) {
  const [handles, setHandles] = useState<string[]>([]);
  useEffect(() => {
    setHandles(listKnownCarrierHandles());
  }, [current]);
  const others = handles.filter((h) => h.toLowerCase() !== current.toLowerCase());
  if (others.length === 0) return null;
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        padding: "10px 14px",
        border: "1px solid var(--line-2)",
        borderRadius: 10,
        background: "rgba(255,255,255,0.025)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
        ⬡ CARRIERS ON THIS BROWSER
      </span>
      <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--gold)", padding: "3px 8px", border: "1px solid var(--gold)", borderRadius: 999 }}>
        @{current} · active
      </span>
      {others.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onSwitch(h)}
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 11,
            color: "var(--ink-2)",
            padding: "3px 8px",
            border: "1px solid var(--line)",
            background: "transparent",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          @{h} · switch
        </button>
      ))}
    </div>
  );
}
