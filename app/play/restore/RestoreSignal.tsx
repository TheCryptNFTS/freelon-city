"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";
import {
  BOOST_RATE,
  CITY_CIVS,
  MIN_BOOST_HEX,
  STRUCTURES,
  baseRate,
  companionMultiplier,
  costOf,
  holderMultiplier,
  reclaimMultiplier,
  setMultiplier,
} from "@/lib/city-config";

/**
 * Restore the Signal — v2, the ONE shared city.
 *
 * No longer a per-browser localStorage idle game: this is a single global
 * world (lib/city-store.ts) that everyone relights together. The client is a
 * thin, optimistic view over a server-authoritative ledger:
 *   - GET  /api/city/state       global progress (works with no wallet)
 *   - POST /api/city/collect      heartbeat — server accrues your signal
 *   - POST /api/city/build        raise a caste-gated structure
 *   - POST /api/city/boost        burn real hex to inject city signal
 *   - GET  /api/city/leaderboard  top contributors this season
 *
 * Your held citizens' CASTES unlock structures; the rarer the caste, the
 * stronger the build. Non-holders play the base Signal Node on borrowed
 * signal — the acquisition ramp. Holders compound (×multiplier) and unlock
 * the high-output structures. The token is the game piece.
 */

const POLL_MS = 20_000;
const TICK_MS = 200;

type StateView = { season: number; totalSignal: number; lit: number };
type WalletView = {
  signal: number;
  contributed: number;
  structures: Record<string, number>;
  balance: number;
  castes: string[];
  setTiers?: number;
  setMultiplier?: number;
  oogieCount?: number;
  companionMultiplier?: number;
  cryptCount?: number;
  reclaimMultiplier?: number;
};
type Leader = { address: string; contributed: number; structures: number };

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 1000) return n.toFixed(n < 10 && n % 1 !== 0 ? 1 : 0);
  const units = ["", "K", "M", "B", "T"];
  let u = 0;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return n.toFixed(2) + units[u];
}

function shortAddr(a: string): string {
  return `0x${a.slice(2, 6)}…${a.slice(-4)}`;
}

const POST = {
  method: "POST",
  headers: { "content-type": "application/json" },
} as const;

export function RestoreSignal() {
  const { address, balance, isHolder, loading } = useHolder();

  const [state, setState] = useState<StateView | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [display, setDisplay] = useState(0); // optimistic spendable
  const [globalDisplay, setGlobalDisplay] = useState(0); // optimistic global total
  const [offlineGain, setOfflineGain] = useState<number | null>(null);
  const [top, setTop] = useState<Leader[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [boostAmt, setBoostAmt] = useState(50);

  // Refs so the optimistic ticker reads live values without re-subscribing.
  const walletRef = useRef<WalletView | null>(null);
  walletRef.current = wallet;

  const ownRate = wallet
    ? baseRate(wallet.structures) *
      holderMultiplier(wallet.balance) *
      (wallet.setMultiplier ?? setMultiplier(wallet.setTiers ?? 0)) *
      (wallet.companionMultiplier ?? companionMultiplier(wallet.oogieCount ?? 0)) *
      (wallet.reclaimMultiplier ?? reclaimMultiplier(wallet.cryptCount ?? 0))
    : 0;

  // ── initial public load (no wallet needed) ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/city/state", { cache: "no-store" });
        if (r.ok && !cancelled) {
          const j = (await r.json()) as { state: StateView };
          setState(j.state);
          setGlobalDisplay(j.state.totalSignal);
        }
      } catch {
        /* offline-friendly: leave nulls, UI shows a dark city */
      }
      try {
        const r = await fetch("/api/city/leaderboard?limit=10", { cache: "no-store" });
        if (r.ok && !cancelled) {
          const j = (await r.json()) as { top: Leader[] };
          setTop(j.top);
        }
      } catch {
        /* leaderboard is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── collect heartbeat (server-authoritative accrual) ────────────────────
  const collect = useCallback(async (addr: string) => {
    try {
      const r = await fetch("/api/city/collect", {
        ...POST,
        body: JSON.stringify({ address: addr }),
      });
      if (!r.ok) return;
      const j = (await r.json()) as {
        state: StateView;
        wallet: WalletView;
        gain: number;
      };
      setState(j.state);
      setWallet(j.wallet);
      setDisplay(j.wallet.signal);
      setGlobalDisplay(j.state.totalSignal);
      if (j.gain > 1) setOfflineGain((g) => (g === null ? j.gain : g));
    } catch {
      /* transient — next poll retries */
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    collect(address);
    const id = setInterval(() => collect(address), POLL_MS);
    return () => clearInterval(id);
  }, [address, collect]);

  // ── optimistic ticker (cosmetic; reconciled by collect) ─────────────────
  useEffect(() => {
    if (ownRate <= 0) return;
    const id = setInterval(() => {
      const inc = (ownRate * TICK_MS) / 1000;
      setDisplay((d) => d + inc);
      setGlobalDisplay((g) => g + inc);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [ownRate]);

  // ── actions ─────────────────────────────────────────────────────────────
  const errorText = (j: { error?: string; requires?: string; detail?: string }) => {
    switch (j.error) {
      case "caste_locked":
        return `LOCKED · HOLD A ${j.requires} CITIZEN`;
      case "insufficient_signal":
        return "NOT ENOUGH SIGNAL YET";
      case "insufficient_hex":
        return "NOT ENOUGH HEX TO BURN";
      case "wallet_not_bound_to_session":
      case "x_session_required":
        return "SIGN IN WITH X (BOUND TO YOUR WALLET) TO BOOST";
      default:
        return (j.error || "ACTION FAILED").toUpperCase();
    }
  };

  const build = useCallback(
    async (key: string) => {
      if (!address || busy) return;
      setBusy(key);
      setMsg(null);
      try {
        const r = await fetch("/api/city/build", {
          ...POST,
          body: JSON.stringify({ address, key }),
        });
        const j = await r.json();
        if (!r.ok) {
          setMsg(errorText(j));
        } else {
          setState(j.state);
          setWallet(j.wallet);
          setDisplay(j.wallet.signal);
          setGlobalDisplay(j.state.totalSignal);
        }
      } catch {
        setMsg("NETWORK ERROR");
      } finally {
        setBusy(null);
      }
    },
    [address, busy],
  );

  const boost = useCallback(async () => {
    if (!address || busy) return;
    setBusy("boost");
    setMsg(null);
    try {
      const r = await fetch("/api/city/boost", {
        ...POST,
        body: JSON.stringify({ address, hex: boostAmt }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(errorText(j));
      } else {
        setState(j.state);
        setWallet(j.wallet);
        setDisplay(j.wallet.signal);
        setGlobalDisplay(j.state.totalSignal);
        setMsg(`BURNED ${fmt(j.burned)} HEX → +${fmt(j.citySignal)} SIGNAL`);
      }
    } catch {
      setMsg("NETWORK ERROR");
    } finally {
      setBusy(null);
    }
  }, [address, busy, boostAmt]);

  const share = useCallback(() => {
    const text = `The city is LIT. ⬡ All ten civilizations restored in Season ${state?.season ?? 1}. FREELON CITY is back online.`;
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/play/restore` : "";
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    if (typeof window !== "undefined") window.open(intent, "_blank", "noopener");
  }, [state]);

  // ── derived ──────────────────────────────────────────────────────────────
  const total = globalDisplay;
  const litCount = CITY_CIVS.filter((c) => total >= c.at).length;
  const restored = litCount >= CITY_CIVS.length;
  const nextCiv = CITY_CIVS.find((c) => total < c.at);
  const prevAt = nextCiv ? CITY_CIVS[CITY_CIVS.indexOf(nextCiv) - 1]?.at ?? 0 : CITY_CIVS[CITY_CIVS.length - 1].at;
  const nextPct = nextCiv
    ? Math.min(100, ((total - prevAt) / (nextCiv.at - prevAt)) * 100)
    : 100;

  const heldCastes = new Set(wallet?.castes ?? []);
  const holderMult = holderMultiplier(wallet?.balance ?? (isHolder ? balance ?? 0 : 0));
  const setTiers = wallet?.setTiers ?? 0;
  const setMult = wallet?.setMultiplier ?? setMultiplier(setTiers);
  const oogieCount = wallet?.oogieCount ?? 0;
  const companionMult =
    wallet?.companionMultiplier ?? companionMultiplier(oogieCount);
  const cryptCount = wallet?.cryptCount ?? 0;
  const reclaimMult = wallet?.reclaimMultiplier ?? reclaimMultiplier(cryptCount);

  return (
    <div className="manifesto" style={{ paddingBottom: 64 }}>
      <section className="manifesto-hero" style={{ paddingBottom: 8 }}>
        <span className="kicker">
          ⬡ IDLE · ONE CITY · SEASON {state?.season ?? 1}
        </span>
        <h1>
          The city is <em>{restored ? "lit" : "dark"}</em>.
        </h1>
        <p className="lead">
          {restored
            ? `All ten civilizations are back online. Season ${state?.season ?? 1} restored.`
            : `Everyone relights it together. ${litCount} of 10 civilizations are lit.`}
        </p>
      </section>

      {/* GLORY FINALE — all ten civilizations lit */}
      {restored && (
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto 24px",
            border: "1px solid var(--gold-bright)",
            borderTop: "3px solid var(--gold-bright)",
            background:
              "linear-gradient(to bottom, rgba(200,167,93,0.12), var(--bg-2))",
            padding: "26px 22px",
            textAlign: "center",
            boxShadow: "0 0 40px rgba(200,167,93,0.25)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.3em",
              color: "var(--gold-bright)",
              marginBottom: 10,
            }}
          >
            ⬡ SIGNAL FULLY RESTORED
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(28px, 7vw, 44px)",
              color: "var(--ink)",
              lineHeight: 1.05,
              marginBottom: 12,
            }}
          >
            THE CITY IS LIT
          </div>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--ink-dim)",
              margin: "0 auto 18px",
              maxWidth: 420,
            }}
          >
            The ten civilizations of FREELON CITY are back online — relit by every
            hand on this page.
            {wallet && wallet.contributed > 0 && (
              <>
                {" "}You added{" "}
                <strong style={{ color: "var(--gold-bright)" }}>
                  {fmt(wallet.contributed)} ⬡
                </strong>{" "}
                to the signal.
              </>
            )}
          </p>
          <button
            onClick={share}
            style={{
              border: "1px solid var(--gold-bright)",
              background: "var(--surface-2)",
              color: "var(--gold-bright)",
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: "0.16em",
              padding: "12px 28px",
              cursor: "pointer",
              boxShadow: "0 0 18px rgba(200,167,93,0.2)",
            }}
          >
            SHARE THE RELIGHT →
          </button>
        </div>
      )}

      {/* holder banner */}
      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          marginBottom: 18,
          color: loading
            ? "var(--ink-fade)"
            : isHolder
              ? "var(--gold-bright)"
              : "var(--ink-dim)",
        }}
      >
        {loading
          ? "READING THE WALLET…"
          : isHolder
            ? `HOLDER · ${balance} CITIZENS · OUTPUT ×${holderMult.toFixed(2)}`
            : "PLAYING ON BORROWED SIGNAL · HOLD A CITIZEN TO UNLOCK CASTE STRUCTURES"}
        {setMult > 1 ? (
          <span style={{ color: setTiers >= 6 ? "var(--gold-bright)" : "var(--gold)", display: "block", marginTop: 4 }}>
            {setTiers >= 6 ? "★ FULL SIGNAL" : `ARTEFACT SET ${setTiers}/6`} · ×{setMult.toFixed(2)} OUTPUT
          </span>
        ) : null}
        {companionMult > 1 ? (
          <span style={{ color: "var(--neon-cyan)", display: "block", marginTop: 4 }}>
            ◈ {oogieCount} OOGIE{oogieCount === 1 ? "" : "S"} TUNED · ×{companionMult.toFixed(2)} OUTPUT
          </span>
        ) : null}
        {reclaimMult > 1 ? (
          <span style={{ color: "var(--state-active)", display: "block", marginTop: 4 }}>
            ⊘ {cryptCount} DEAD SIGNAL{cryptCount === 1 ? "" : "S"} RECLAIMED · ×{reclaimMult.toFixed(2)} OUTPUT
          </span>
        ) : null}
      </div>

      {/* offline gain */}
      {offlineGain !== null && (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto 20px",
            border: "1px solid var(--line)",
            borderLeft: "2px solid var(--neon-cyan)",
            background: "var(--bg-2)",
            padding: "12px 16px",
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--ink-dim)",
            textAlign: "center",
          }}
        >
          WHILE YOU WERE DARK, YOU GENERATED{" "}
          <strong style={{ color: "var(--neon-cyan)" }}>{fmt(offlineGain)} ⬡</strong>
        </div>
      )}

      {/* GLOBAL city signal */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "var(--ink-fade)",
            marginBottom: 6,
          }}
        >
          THE CITY HAS GENERATED
        </div>
        <div
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(36px, 9vw, 64px)",
            color: "var(--ink)",
            lineHeight: 1,
            textShadow: "0 0 24px rgba(0,217,184,.35)",
          }}
        >
          {fmt(total)} ⬡
        </div>
        {wallet && (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: "0.2em",
              color: "var(--neon-cyan)",
              marginTop: 6,
            }}
          >
            YOUR SHARE {fmt(wallet.contributed)} ⬡ · YOU MAKE {fmt(ownRate)}/SEC
          </div>
        )}
      </div>

      {/* next-civ progress */}
      {nextCiv && (
        <div style={{ maxWidth: 520, margin: "18px auto 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--ink-fade)",
              marginBottom: 6,
            }}
          >
            <span>NEXT: {nextCiv.name.toUpperCase()}</span>
            <span>{fmt(total)} / {fmt(nextCiv.at)}</span>
          </div>
          <div
            style={{
              height: 8,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${nextPct}%`,
                background: nextCiv.color,
                boxShadow: `0 0 12px ${nextCiv.color}`,
                transition: "width .2s linear",
              }}
            />
          </div>
        </div>
      )}

      {/* spendable + status line */}
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 13,
            letterSpacing: "0.12em",
            color: "var(--ink-dim)",
          }}
        >
          {address ? (
            <>
              YOUR SPENDABLE SIGNAL:{" "}
              <strong style={{ color: "var(--neon-cyan)" }}>{fmt(display)} ⬡</strong>
            </>
          ) : (
            "CONNECT OR SYNC A WALLET TO BUILD"
          )}
        </span>
      </div>

      {msg && (
        <div
          style={{
            textAlign: "center",
            marginTop: 10,
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--gold-bright)",
          }}
        >
          {msg}
        </div>
      )}

      {/* build catalog (caste-gated) */}
      <div style={{ display: "grid", gap: 12, maxWidth: 520, margin: "24px auto 0" }}>
        {STRUCTURES.map((s) => {
          const owned = wallet?.structures[s.key] ?? 0;
          const cost = costOf(s, owned);
          const casteOk = s.caste === null || heldCastes.has(s.caste);
          const afford = display >= cost && !!address;
          const canBuild = casteOk && afford && busy === null;
          const locked = !casteOk;
          return (
            <button
              key={s.key}
              onClick={() => build(s.key)}
              disabled={!canBuild}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                border: "1px solid var(--line)",
                borderLeft: `2px solid ${s.accent}`,
                background: canBuild ? "var(--bg-2)" : "var(--surface)",
                padding: "14px 16px",
                cursor: canBuild ? "pointer" : "not-allowed",
                opacity: locked ? 0.4 : canBuild ? 1 : 0.6,
                transition: "opacity .15s, border-color .15s",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)" }}>
                  {s.name}{" "}
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: s.accent }}>
                    ×{owned}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 3,
                  }}
                >
                  {s.desc} · +{s.rate}/sec
                </div>
                {s.caste && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      color: casteOk ? s.accent : "var(--ink-fade)",
                      marginTop: 4,
                    }}
                  >
                    {casteOk ? `✓ ${s.caste}` : `🔒 HOLD A ${s.caste} CITIZEN`}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  color: afford ? "var(--neon-cyan)" : "var(--ink-fade)",
                }}
              >
                {fmt(cost)} ⬡
              </div>
            </button>
          );
        })}
      </div>

      {/* real-hex boost (holders only — burns real hex) */}
      {isHolder && (
        <div
          style={{
            maxWidth: 520,
            margin: "22px auto 0",
            border: "1px solid var(--line)",
            borderTop: "2px solid var(--gold-bright)",
            background: "var(--bg-2)",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "var(--gold-bright)",
              marginBottom: 10,
            }}
          >
            TITHE TO THE CITY · BURN HEX → SIGNAL (×{BOOST_RATE})
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[MIN_BOOST_HEX, 50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setBoostAmt(amt)}
                style={{
                  border: `1px solid ${boostAmt === amt ? "var(--gold-bright)" : "var(--line)"}`,
                  background: boostAmt === amt ? "var(--surface-2)" : "transparent",
                  color: boostAmt === amt ? "var(--gold-bright)" : "var(--ink-dim)",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                {amt}
              </button>
            ))}
            <button
              onClick={boost}
              disabled={busy !== null}
              style={{
                marginLeft: "auto",
                border: "1px solid var(--gold-bright)",
                background: "var(--surface-2)",
                color: "var(--gold-bright)",
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.16em",
                padding: "10px 20px",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy === "boost" ? "BURNING…" : `BURN ${boostAmt} HEX`}
            </button>
          </div>
        </div>
      )}

      {/* civ skyline — copies the /civilizations card treatment: each
          civ's webp "plate" sits behind a civ-colored, rounded, scan-line
          relic card. Dark = plate dimmed to a whisper; lit = plate brightens
          and the civ color glows. */}
      <div className="city-skyline">
        {CITY_CIVS.map((c) => {
          const lit = total >= c.at;
          return (
            <div
              key={c.slug}
              className={`relic-card scan-card city-skyline__plate${lit ? " is-lit" : ""}`}
              title={`${c.name} · ${fmt(c.at)} ⬡`}
              style={
                {
                  "--civ": c.color,
                  "--plate": `url(/civs/${c.slug}.webp)`,
                } as React.CSSProperties
              }
            >
              <span className="city-skyline__dot" aria-hidden />
              <span className="city-skyline__name">
                {c.name.split(" ")[1]?.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        .city-skyline {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          max-width: 520px;
          margin: 28px auto 0;
        }
        /* plate background mirrors .civ-card.has-plate::before */
        .city-skyline__plate {
          position: relative;
          aspect-ratio: 3 / 4;
          border: 1px solid var(--line);
          border-top: 2px solid var(--civ);
          border-radius: 14px;
          overflow: hidden;
          isolation: isolate;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 8px;
          background-color: var(--surface);
        }
        .city-skyline__plate::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background-image: var(--plate);
          background-size: cover;
          background-position: center;
          opacity: 0.10;
          filter: saturate(0.5) grayscale(0.4);
          transition: opacity .4s ease, filter .4s ease;
        }
        .city-skyline__plate.is-lit::before {
          opacity: 0.55;
          filter: saturate(1) grayscale(0);
        }
        .city-skyline__plate.is-lit {
          box-shadow: 0 0 18px color-mix(in srgb, var(--civ) 35%, transparent);
        }
        .city-skyline__plate:hover::before { opacity: 0.7; }
        .city-skyline__dot {
          position: absolute;
          top: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--line-2);
          transition: background .4s, box-shadow .4s;
        }
        .city-skyline__plate.is-lit .city-skyline__dot {
          background: var(--civ);
          box-shadow: 0 0 10px var(--civ);
        }
        .city-skyline__name {
          font-family: var(--mono2);
          font-size: 7px;
          letter-spacing: 0.1em;
          text-align: center;
          line-height: 1.2;
          color: var(--ink-fade);
          text-transform: uppercase;
          position: relative;
        }
        .city-skyline__plate.is-lit .city-skyline__name { color: var(--ink); }
      `}</style>

      {/* leaderboard */}
      {top.length > 0 && (
        <div style={{ maxWidth: 520, margin: "28px auto 0" }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "var(--ink-fade)",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            TOP CONTRIBUTORS · SEASON {state?.season ?? 1}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {top.map((t, i) => {
              const me = address && t.address.toLowerCase() === address.toLowerCase();
              return (
                <div
                  key={t.address}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    padding: "8px 12px",
                    border: "1px solid var(--line)",
                    background: me ? "var(--surface-2)" : "transparent",
                    color: me ? "var(--neon-cyan)" : "var(--ink-dim)",
                  }}
                >
                  <span>
                    {String(i + 1).padStart(2, "0")} · {shortAddr(t.address)}
                    {me ? " · YOU" : ""}
                  </span>
                  <span>{fmt(t.contributed)} ⬡</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginTop: 28,
          flexWrap: "wrap",
        }}
      >
        <Link className="btn btn-ghost" href="/play">
          <span className="ttl">← ARCADE</span>
        </Link>
      </div>

      <p
        style={{
          textAlign: "center",
          marginTop: 24,
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "var(--ink-fade)",
        }}
      >
        ONE SHARED CITY · SERVER-AUTHORITATIVE · LIGHT ALL TEN FOR GLORY
      </p>
    </div>
  );
}
