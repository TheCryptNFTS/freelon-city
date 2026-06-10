"use client";
import { useEffect, useState } from "react";
import { CANON } from "@/lib/canon";
import { stampViewerAddr } from "@/lib/viewer-cookie";
import { proveWallet } from "@/lib/wallet-proof";

type Props = { tokenId: number };

/**
 * Watchlist toggle with self-serve wallet entry.
 *
 * UX flow:
 *   1. If `freelon_addr` cookie exists (set on wallet visits), use it
 *      automatically. Most users hit this path.
 *   2. If no cookie, the user can type/paste their address inline.
 *      The component validates with the same regex used server-side
 *      and persists the cookie on success so they don't have to type
 *      it again.
 *   3. Address is shown shortened with a "switch" link so users can
 *      change wallets without clearing cookies manually.
 *
 * Removes the cookie-from-wallet-visit dependency that made the feature
 * undiscoverable in v1.
 */
export function WatchlistButton({ tokenId }: Props) {
  const [addr, setAddr] = useState<string | null>(null);
  const [editingAddr, setEditingAddr] = useState(false);
  const [draft, setDraft] = useState("");
  const [watching, setWatching] = useState<boolean | null>(null);
  const [cost, setCost] = useState<number>(50);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
    if (m) setAddr(decodeURIComponent(m[1]));
    else setEditingAddr(true);
  }, []);

  useEffect(() => {
    if (!addr) return;
    let cancelled = false;
    fetch(`/api/watchlist?addr=${addr}`)
      .then((r) => r.json())
      .then((j: { tokens?: number[]; cost?: number; balance?: number }) => {
        if (cancelled) return;
        setWatching((j.tokens || []).includes(tokenId));
        setCost(j.cost ?? 50);
        setBalance(j.balance ?? 0);
      })
      .catch(() => { if (!cancelled) setError("network"); });
    return () => { cancelled = true; };
  }, [addr, tokenId]);

  function saveAddr(value: string) {
    const trimmed = value.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(trimmed)) {
      setError("ADDRESS MALFORMED · 0x + 40 hex required");
      return;
    }
    setError(null);
    setAddr(trimmed);
    setEditingAddr(false);
    stampViewerAddr(trimmed);
  }

  async function toggle() {
    if (!addr || watching === null) return;
    setBusy(true);
    setError(null);
    const doPost = () =>
      fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          addr,
          tokenId,
          action: watching ? "remove" : "add",
        }),
      });
    try {
      let res = await doPost();
      let j = await res.json();
      // Adding to the watchlist burns ⬡ — needs a one-time wallet signature.
      if (res.status === 401 && j?.error === "wallet_proof_required") {
        const proof = await proveWallet(addr);
        if (!proof.ok) {
          setError(
            proof.reason === "no_wallet"
              ? "OPEN IN YOUR WALLET'S BROWSER TO WATCH"
              : proof.reason === "rejected"
              ? "SIGNATURE DECLINED · NEEDED ONCE TO WATCH"
              : `${CANON.LOST} · couldn't prove wallet · retry`,
          );
          return;
        }
        res = await doPost();
        j = await res.json();
      }
      if (!res.ok) {
        const map: Record<string, string> = {
          insufficient_hex: `HEX BALANCE LOW · need ${cost} ⬡`,
          already_watching: "ALREADY WATCHING THIS CITIZEN",
          watchlist_full: "WATCHLIST FULL · 50 max",
          invalid_address: "ADDRESS MALFORMED",
          invalid_token: "CITIZEN ID OUT OF RANGE",
          add_failed: `${CANON.LOST} · retry`,
          debit_failed: `${CANON.LOST} · hex debit failed · retry`,
        };
        setError(map[j.error] || `${CANON.LOST} · ${j.error || "unknown"}`);
        return;
      }
      setWatching(!watching);
      if (j.burned) setBalance((b) => (b !== null ? b - j.burned : null));
    } catch {
      setError(`${CANON.LOST} · retry`);
    } finally {
      setBusy(false);
    }
  }

  const insufficient = !watching && balance !== null && balance < cost;
  const color = watching ? "var(--state-danger)" : "var(--gold)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {editingAddr || !addr ? (
        <>
          <label style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
            ⬡ ENTER YOUR WALLET ADDRESS
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="0x..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveAddr(draft); }}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--line-2)",
                borderRadius: 8,
                color: "var(--ink)",
                fontFamily: "var(--mono2)",
                fontSize: 12,
              }}
            />
            <button
              onClick={() => saveAddr(draft)}
              style={{
                padding: "10px 14px",
                background: "var(--gold)",
                border: "none",
                borderRadius: 8,
                color: "#000",
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              BIND
            </button>
          </div>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.1em", lineHeight: 1.5, margin: 0 }}>
            Cookie-only, no signature required. We use this to show your hex balance and watchlist.
          </p>
        </>
      ) : (
        <>
          <button
            onClick={toggle}
            disabled={busy || watching === null || insufficient}
            style={{
              padding: "12px 16px",
              border: `1px solid ${color}`,
              background: `${color}10`,
              color,
              fontFamily: "var(--mono2)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
              borderRadius: 8,
              cursor: busy || insufficient ? "default" : "pointer",
              opacity: busy || insufficient ? 0.5 : 1,
            }}
          >
            {busy
              ? "..."
              : watching
                ? "● WATCHING · remove"
                : insufficient
                  ? `⬡ Need ${cost} ⬡ (you have ${balance})`
                  : `⬡ Watch this citizen · ${cost} ⬡`}
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.1em" }}>
            <span>
              Wallet: <code style={{ color: "var(--ink-2)" }}>{addr.slice(0, 6)}…{addr.slice(-4)}</code>
            </span>
            <button
              onClick={() => { setEditingAddr(true); setDraft(""); }}
              style={{ background: "none", border: "none", color: "var(--ink-dim)", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 10, letterSpacing: "0.1em", padding: 0 }}
            >
              switch
            </button>
          </div>
        </>
      )}
      <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.1em", lineHeight: 1.5, margin: 0 }}>
        Watchers are notified first if this citizen flags as a Red Signal — a 24h early-notice window. Snapshot is frozen at flag time; adding after doesn&apos;t help.
      </p>
      {error && (
        <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--state-danger)" }}>{error}</p>
      )}
    </div>
  );
}
