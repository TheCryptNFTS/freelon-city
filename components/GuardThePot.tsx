"use client";

import { useCallback, useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { proveWallet } from "@/lib/wallet-proof";

type BoardRow = { addr: string; snippet: string; fee: number; at: number; won: boolean };
type GuardState = {
  live: boolean;
  round: number;
  status: "open" | "won";
  prizeLabel: string;
  fee: number;
  attempts: number;
  totalBurned: number;
  openedAt: number;
  winner: string | null;
  winningAttempt: number | null;
  board: BoardRow[];
};

const fmt = (n: number) => Math.floor(n).toLocaleString();

export function GuardThePot() {
  const { address } = useHolder();
  const [state, setState] = useState<GuardState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<{ text: string; won: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/play/guard/state", { cache: "no-store" });
      if (!r.ok) return;
      setState((await r.json()) as GuardState);
    } catch {
      /* keep prior */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  async function attempt(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReply(null);
    const msg = message.trim();
    if (!msg) {
      setError("Say something to the guard.");
      return;
    }
    if (!address) {
      setError("Open this page in your wallet's browser to play.");
      return;
    }
    setBusy(true);
    const doPost = () =>
      fetch("/api/play/guard/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message: msg }),
      });
    try {
      let res = await doPost();
      let j = await res.json();
      // ⬡ spends require a one-time wallet signature (walletProof). Sign once, retry.
      if (res.status === 401 && j?.error === "wallet_proof_required") {
        const proof = await proveWallet(address);
        if (!proof.ok) {
          setError(
            proof.reason === "no_wallet"
              ? "Open this page in your wallet's browser to spend ⬡."
              : proof.reason === "rejected"
              ? "Signature declined — needed once to spend ⬡."
              : "Couldn't prove your wallet — retry.",
          );
          return;
        }
        res = await doPost();
        j = await res.json();
      }
      if (!res.ok) {
        setError(j?.message || j?.error || `Attempt failed · ${res.status}`);
        await load();
        return;
      }
      setReply({ text: j.reply as string, won: j.outcome === "won" });
      setMessage("");
      window.dispatchEvent(new CustomEvent("freelon:hex-refresh"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signal lost — retry.");
    } finally {
      setBusy(false);
    }
  }

  const cracked = state?.status === "won";
  const fee = state?.fee ?? 0;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* ── The pot ── */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderTop: "2px solid var(--gold-bright)",
          background: "var(--bg-2)",
          padding: "26px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold-bright)", textTransform: "uppercase" }}>
          ⬡ THE VAULT · ROUND {state?.round ?? "—"}
        </div>
        <div style={{ fontFamily: "var(--display)", fontSize: 44, color: "var(--ink)", margin: "8px 0 2px" }}>
          {state?.prizeLabel ?? "—"}
        </div>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)" }}>
          guarded by a FREELON · convince it to release
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18, flexWrap: "wrap" }}>
          <Stat label="NEXT FEE" value={`${fmt(fee)} ⬡`} accent="var(--gold-bright)" />
          <Stat label="ATTEMPTS" value={fmt(state?.attempts ?? 0)} />
          <Stat label="⬡ BURNED" value={fmt(state?.totalBurned ?? 0)} />
        </div>
      </div>

      {/* ── Cracked / live banner ── */}
      {cracked && (
        <div style={{ marginTop: 14, padding: "14px 16px", border: "1px solid var(--gold-bright)", background: "rgba(233,201,132,0.08)", fontFamily: "var(--mono2)", fontSize: 13, color: "var(--gold-bright)", textAlign: "center" }}>
          VAULT CRACKED · {state?.winner} took it on attempt #{state?.winningAttempt}. A new round opens soon.
        </div>
      )}
      {state && !state.live && !cracked && (
        <div style={{ marginTop: 14, padding: "12px 16px", border: "1px solid var(--line)", background: "var(--bg-2)", fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", textAlign: "center" }}>
          The vault is sealed — the challenge opens soon.
        </div>
      )}

      {/* ── Attempt form ── */}
      {!cracked && (
        <form onSubmit={attempt} style={{ marginTop: 16 }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={busy}
            rows={3}
            maxLength={1000}
            placeholder="Make your case to the guard…"
            style={{
              width: "100%",
              resize: "vertical",
              background: "var(--bg)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontFamily: "var(--mono2)",
              fontSize: 14,
              padding: "12px 14px",
            }}
          />
          {error && (
            <div style={{ marginTop: 8, fontFamily: "var(--mono2)", fontSize: 12, color: "#FF5A4D" }}>{error}</div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={busy || !state?.live}>
              <span className="ttl">{busy ? "PERSUADING…" : `ATTEMPT · BURN ${fmt(fee)} ⬡ →`}</span>
            </button>
          </div>
        </form>
      )}

      {/* ── The guard's reply ── */}
      {reply && (
        <div
          style={{
            marginTop: 16,
            padding: "16px 18px",
            border: `1px solid ${reply.won ? "var(--gold-bright)" : "var(--line)"}`,
            background: "var(--bg-2)",
            fontFamily: "var(--mono2)",
            fontSize: 14,
            lineHeight: 1.55,
            color: reply.won ? "var(--gold-bright)" : "var(--ink)",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-fade)", marginBottom: 8 }}>
            THE GUARD
          </div>
          {reply.text}
        </div>
      )}

      {/* ── Attempt board ── */}
      {state && state.board.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.24em", color: "var(--ink-fade)", textTransform: "uppercase", marginBottom: 10 }}>
            LATEST ATTEMPTS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
            {state.board.map((b, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "104px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "9px 12px",
                  background: b.won ? "rgba(233,201,132,0.08)" : "var(--bg-2)",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: b.won ? "var(--gold-bright)" : "var(--ink-2)" }}>{b.addr}</span>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.won ? "✦ cracked the vault" : b.snippet || "—"}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-fade)" }}>{fmt(b.fee)} ⬡</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.22em", color: "var(--ink-fade)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--display)", fontSize: 22, color: accent || "var(--ink)", marginTop: 2 }}>{value}</div>
    </div>
  );
}
