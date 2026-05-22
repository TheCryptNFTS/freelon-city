"use client";
import { useEffect, useState } from "react";
import { cityNotice } from "@/lib/city-notice";
import { ECONOMY } from "@/lib/economy-constants";

type Civ = { slug: string; name: string; color: string };

type Props = {
  address: string;
  civs: Civ[];
  /** Optional: pre-fill the display name (e.g. carrier handle). */
  defaultDisplay?: string;
};

const MIN = ECONOMY.TITHE_MIN;

export function TitheForm({ address, civs, defaultDisplay = "" }: Props) {
  const [civ, setCiv] = useState(civs[0]?.slug ?? "");
  const [amount, setAmount] = useState<string>(String(ECONOMY.TITHE_MIN));
  const [display, setDisplay] = useState<string>(defaultDisplay);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<{ amount: number; civ: string } | null>(null);
  const [walletHex, setWalletHex] = useState<number | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/wallet/${address}/hex`)
      .then((r) => r.json())
      .then((j: { balance?: number }) => {
        if (!cancelled && typeof j.balance === "number") setWalletHex(j.balance);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [address]);

  const amountN = parseInt(amount, 10);
  const validAmount = Number.isFinite(amountN) && amountN >= MIN;
  const afterBurn = walletHex !== null && validAmount ? Math.max(0, walletHex - amountN) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n < MIN) {
      setError(`Minimum tithe is ${MIN} ⬡`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tithe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          civ,
          amount: n,
          display: display.trim().slice(0, 32) || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        if (j?.error === "x_session_required") {
          setError("Sign in with X first — tithe requires a verified session.");
        } else if (j?.error === "insufficient_hex") {
          setError(`Insufficient hex. Balance: ${j.balance} ⬡, needed: ${j.needed} ⬡.`);
        } else if (j?.error?.startsWith?.("min_tithe_")) {
          setError(`Minimum tithe is ${MIN} ⬡`);
        } else {
          setError(j?.error || `Tithe failed (${res.status})`);
        }
        return;
      }
      setOk({ amount: n, civ });
      // Refresh wallet hex log on success
      window.dispatchEvent(new CustomEvent("freelon:hex-refresh"));
      cityNotice({
        title: "THE CITY NOTICED",
        body: `Your name burned into ${selected?.name ?? civ} for 7 days`,
        delta: `-${n} ⬡`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  const selected = civs.find((c) => c.slug === civ);

  return (
    <form className="tithe-form" onSubmit={submit}>
      <div className="tithe-head">
        <span className="kicker">⬡ TITHE · BURN HEX FOR THE WALL</span>
        <span className="tithe-sub">Names live on /patrons for 7 days.</span>
      </div>
      <div className="tithe-grid">
        <label className="tithe-field">
          <span>CIVILIZATION</span>
          <select value={civ} onChange={(e) => setCiv(e.target.value)} disabled={busy}>
            {civs.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="tithe-field">
          <span>AMOUNT ⬡ (min {MIN})</span>
          <input
            type="number"
            min={MIN}
            step={50}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="tithe-field tithe-field-wide">
          <span>DISPLAY NAME (optional)</span>
          <input
            type="text"
            maxLength={32}
            placeholder={defaultDisplay || `0x${address.slice(2, 6)}…${address.slice(-4)}`}
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            disabled={busy}
          />
        </label>
      </div>
      {error && <div className="tithe-err">{error}</div>}
      {ok && (
        <div className="tithe-ok" style={{ borderColor: selected?.color }}>
          ⬡ Burned {ok.amount.toLocaleString()} ⬡ to <strong>{selected?.name}</strong>. See you on /patrons.
        </div>
      )}
      {walletHex !== null && validAmount && afterBurn !== null && (
        <div className="tithe-preview">
          <span className="tp-label">BEFORE</span>
          <span className="tp-num">{walletHex.toLocaleString()} ⬡</span>
          <span className="tp-arrow">→</span>
          <span className="tp-label">AFTER</span>
          <span className="tp-num" style={{ color: selected?.color || "var(--gold-bright)" }}>{afterBurn.toLocaleString()} ⬡</span>
        </div>
      )}
      <div className="tithe-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy}
          style={selected?.color ? { borderColor: selected.color, background: selected.color, color: "var(--bg)" } : undefined}
        >
          <span className="ttl">{busy ? "BURNING…" : `BURN ${amount} ⬡ →`}</span>
        </button>
      </div>
    </form>
  );
}
