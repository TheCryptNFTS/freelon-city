"use client";
import { useState } from "react";
import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";
import { useViewerAddr } from "@/lib/use-viewer";
import { proveWallet } from "@/lib/wallet-proof";

type Public = {
  id: string;
  authorHandle: string;
  authorShort: string;
  civ: string;
  caption: string;
  imageUrl: string;
  createdAt: number;
  signals: number;
  boostHex: number;
  score: number;
  status: "live" | "hidden" | "removed";
};

const CIV_INFO = CIVILIZATIONS as Record<string, { name: string; color: string }>;

function timeAgo(ms: number): string {
  const dt = Math.floor((Date.now() - ms) / 1000);
  if (dt < 60) return `${dt}s ago`;
  if (dt < 3600) return `${Math.floor(dt / 60)}m ago`;
  if (dt < 86400) return `${Math.floor(dt / 3600)}h ago`;
  return `${Math.floor(dt / 86400)}d ago`;
}

export function TransmissionCard({ t: initialT, compact }: { t: Public; compact?: boolean }) {
  const [t, setT] = useState<Public>(initialT);
  const [signaling, setSignaling] = useState(false);
  const [hasSignaled, setHasSignaled] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [boostAmt, setBoostAmt] = useState("50");
  const [err, setErr] = useState<string | null>(null);
  const viewer = useViewerAddr();

  const civ = CIV_INFO[t.civ];
  const color = civ?.color || "var(--gold)";

  async function signal() {
    setErr(null);
    if (!viewer.addr) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSignaling(true);
    try {
      const r = await fetch(`/api/transmissions/${t.id}/signal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addr: viewer.addr }),
      });
      const j = await r.json();
      if (!r.ok) {
        const map: Record<string, string> = {
          session_required: "SIGN IN WITH X FIRST",
          not_a_carrier: "CARRIER STATUS REQUIRED",
          already_signaled: "ALREADY SIGNALED",
        };
        setErr(map[j.error] || `SIGNAL FAILED · ${j.error || "?"}`);
        if (j.error === "already_signaled") setHasSignaled(true);
        return;
      }
      setT({ ...t, signals: j.signals, boostHex: j.boostHex });
      setHasSignaled(true);
    } catch {
      setErr("SIGNAL LOST · RETRY");
    } finally {
      setSignaling(false);
    }
  }

  async function boost() {
    setErr(null);
    if (!viewer.addr) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const addr = viewer.addr;
    const hex = Math.floor(Number(boostAmt));
    if (!Number.isFinite(hex) || hex < 10) { setErr("MIN BOOST 10⬡"); return; }
    setBoosting(true);
    // Idempotency key — server dedupes retries against this so a
    // network blip + retry doesn't double-debit.
    const idemKey = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
    const doPost = () =>
      fetch(`/api/transmissions/${t.id}/boost`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addr, hex, idemKey }),
      });
    try {
      let r = await doPost();
      let j = await r.json();
      // Boosting burns ⬡ — needs a one-time wallet signature (walletProof).
      if (r.status === 401 && j?.error === "wallet_proof_required") {
        const proof = await proveWallet(addr);
        if (!proof.ok) {
          setErr(
            proof.reason === "no_wallet"
              ? "OPEN IN YOUR WALLET'S BROWSER TO BOOST"
              : proof.reason === "rejected"
              ? "SIGNATURE DECLINED · NEEDED ONCE TO BOOST"
              : "COULDN'T PROVE WALLET · RETRY",
          );
          return;
        }
        r = await doPost();
        j = await r.json();
      }
      if (!r.ok) {
        const map: Record<string, string> = {
          session_required: "SIGN IN WITH X FIRST",
          cannot_boost_own: "CANNOT BOOST YOUR OWN",
          insufficient_hex: `HEX BALANCE LOW · NEED ${hex}⬡`,
          debit_failed: "DEBIT FAILED",
        };
        setErr(map[j.error] || `BOOST REJECTED · ${j.error || "?"}`);
        return;
      }
      setT({ ...t, signals: j.signals, boostHex: j.boostHex });
    } catch {
      setErr("SIGNAL LOST · RETRY");
    } finally {
      setBoosting(false);
    }
  }

  return (
    <article
      style={{
        border: `1px solid ${color}33`,
        borderRadius: 14,
        overflow: "hidden",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Link href={`/transmissions/${t.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{ position: "relative", aspectRatio: compact ? "16/9" : "4/3", overflow: "hidden", background: "#000", borderBottom: `1px solid ${color}33` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.imageUrl}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 10px", background: `${color}22`, border: `1px solid ${color}66`, borderRadius: 999, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.15em", color, textTransform: "uppercase" }}>
            {civ?.name ?? t.civ}
          </div>
        </div>
        <div style={{ padding: "var(--s-3) var(--s-3) var(--s-2)" }}>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink)", lineHeight: 1.5, margin: 0 }}>
            {t.caption}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.1em" }}>
            <span>@{t.authorHandle} · {t.authorShort}</span>
            <span>{timeAgo(t.createdAt)}</span>
          </div>
        </div>
      </Link>

      <div style={{ padding: "var(--s-3)", borderTop: `1px solid ${color}22`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={signal}
          disabled={signaling || hasSignaled}
          style={{
            padding: "8px 12px",
            border: `1px solid ${hasSignaled ? "var(--state-active)" : color}`,
            background: hasSignaled ? "rgba(233,201,132,0.12)" : `${color}14`,
            color: hasSignaled ? "var(--state-active)" : color,
            borderRadius: 8,
            fontFamily: "var(--mono2)",
            fontSize: 11,
            letterSpacing: "0.15em",
            cursor: signaling || hasSignaled ? "default" : "pointer",
            fontWeight: 600,
          }}
        >
          {hasSignaled ? `✓ ${t.signals} ⬢` : `⬢ ${t.signals} · SIGNAL`}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
          <input
            type="number"
            value={boostAmt}
            min={10}
            max={5000}
            onChange={(e) => setBoostAmt(e.target.value)}
            style={{
              width: 64,
              padding: "8px 8px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--ink)",
              fontFamily: "var(--mono2)",
              fontSize: 11,
              textAlign: "right",
            }}
          />
          <button
            type="button"
            onClick={boost}
            disabled={boosting}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--gold)",
              background: "rgba(200,167,93,0.10)",
              color: "var(--gold)",
              borderRadius: 8,
              fontFamily: "var(--mono2)",
              fontSize: 11,
              letterSpacing: "0.15em",
              cursor: boosting ? "default" : "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {boosting ? "…" : "↑ BOOST"}
          </button>
        </div>

        <div style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.1em" }}>
          SCORE {t.score} · {t.boostHex} ⬡ BOOSTED
        </div>
      </div>
      {err && (
        <div style={{ padding: "8px 12px", fontFamily: "var(--mono2)", fontSize: 10, color: "var(--state-danger)", borderTop: `1px solid ${color}22` }}>
          {err}
        </div>
      )}
    </article>
  );
}
