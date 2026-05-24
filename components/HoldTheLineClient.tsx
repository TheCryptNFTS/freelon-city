"use client";
/**
 * <HoldTheLineClient /> — claim form for defender bids.
 *
 * Inputs: wallet (autofilled if synced) + bid ETH + offer URL (optional).
 * Fetches live floor on mount so the form can warn if the bid is too low.
 * Posts to /api/defender which records the claim; founder verifies + credits.
 */
import { useEffect, useState } from "react";
import { useViewerAddr } from "@/lib/use-viewer";

export function HoldTheLineClient() {
  const viewer = useViewerAddr();
  const [floorEth, setFloorEth] = useState<number | null>(null);
  const [bidEth, setBidEth] = useState("0.0050");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/opensea/stats", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { total?: { floor_price?: number } } | null) => {
        const f = Number(j?.total?.floor_price || 0);
        if (f > 0) setFloorEth(f);
      })
      .catch(() => {});
  }, []);

  const bidNum = Number(bidEth);
  const required = floorEth ? floorEth * 1.4 : null;
  const tooLow = required != null && bidNum > 0 && bidNum < required;
  const canSubmit = !!viewer.addr && bidNum > 0 && !tooLow && !busy && !!floorEth;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/defender", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: viewer.addr,
          bidEth: bidNum,
          floorEth,
          evidenceUrl: evidenceUrl.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        const map: Record<string, string> = {
          session_required: "Sign in with X first — wallet must be bound to your session.",
          bid_too_low: "Bid is below 1.4× floor — won't qualify.",
          missing_floor: "Floor price unavailable — try again in a minute.",
          invalid_wallet: "Wallet address malformed.",
          invalid_bid: "Enter a valid bid amount.",
        };
        setMsg({ type: "err", text: map[j.error] || `Claim rejected · ${j.error || "?"}` });
        return;
      }
      setMsg({ type: "ok", text: j.nextStep || "Bid recorded. Hex credits land after verification." });
      setEvidenceUrl("");
    } catch {
      setMsg({ type: "err", text: "Network error · retry" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        padding: "var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <label style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          Your wallet
        </label>
        <div
          style={{
            padding: "10px 14px",
            border: "1px solid var(--line)",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: viewer.addr ? "var(--ink)" : "var(--ink-dim)",
          }}
        >
          {viewer.addr || "Connect or sync your wallet first"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <label style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          Your bid (Ξ)
          {required != null && (
            <span style={{ marginLeft: 8, color: tooLow ? "#FF5A4D" : "var(--ink-2)" }}>
              · min {required.toFixed(4)} Ξ (1.4× floor)
            </span>
          )}
        </label>
        <input
          type="number"
          step="0.0001"
          min="0"
          value={bidEth}
          onChange={(e) => setBidEth(e.target.value)}
          style={{
            padding: "10px 14px",
            border: `1px solid ${tooLow ? "#FF5A4D" : "var(--line)"}`,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            fontFamily: "var(--mono2)",
            fontSize: 14,
            color: "var(--ink)",
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <label style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          Evidence URL (optional · OpenSea offer or tx)
        </label>
        <input
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://opensea.io/…"
          style={{
            padding: "10px 14px",
            border: "1px solid var(--line)",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: "var(--ink)",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn btn-primary"
        style={{ opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? "pointer" : "not-allowed" }}
      >
        <span className="ttl">CLAIM YOUR BID →</span>
      </button>

      {msg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: msg.type === "ok" ? "rgba(122,224,141,0.08)" : "rgba(255,90,77,0.08)",
            border: `1px solid ${msg.type === "ok" ? "#7AE08D55" : "#FF5A4D55"}`,
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: msg.type === "ok" ? "#7AE08D" : "#FF5A4D",
          }}
        >
          {msg.text}
        </div>
      )}
    </form>
  );
}
