"use client";

import { useState, useRef } from "react";
import { trackEvent } from "@/lib/track";

/**
 * In-workspace ETH unlock — the pay flow holders were missing.
 *
 * The ETH activation UI used to live in the old CitizenAgentDashboard, which was
 * unmounted (and since removed) after the profile was slimmed to the workspace
 * front door. Holders trying to pay 0.01 ETH hit a dead-end link ("can't find where
 * to unlock"). This restores the exact quote → pay → claim flow against
 * /api/citizens/[id]/unlock, rendered in the CENTER of the workspace (always
 * visible on mobile — not buried in the right info-drawer that overlapped).
 */
type Quote = { amountEth: string; amountWei: string; toWallet: string; expiresAt: number };
type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

export function WorkspaceUnlock({
  citizenId,
  address,
  accent,
  tier,
  priceEth,
  onConnect,
  onUnlocked,
}: {
  citizenId: number;
  address: string | null;
  accent: string;
  tier?: string;
  priceEth?: number;
  onConnect: () => void;
  onUnlocked: () => void;
}) {
  const [step, setStep] = useState<"idle" | "quoting" | "await" | "confirming">("idle");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [txInput, setTxInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [noWallet, setNoWallet] = useState(false);
  // Fire-once funnel guard: awaken_started is the missing denominator for
  // activation_paid (tx-abandon rate). Fires on the AWAKEN intent, before pay.
  const startedRef = useRef(false);
  // Fire-once guard for the revenue event (claim can be reached via pay() or the
  // manual tx-hash paste; both are one legit activation).
  const paidRef = useRef(false);

  function eth(): Eth | null {
    return typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eth }).ethereum ?? null) : null;
  }

  async function sign(): Promise<{ address: string; signature: string }> {
    const e = eth();
    if (!e || !address) throw new Error("Open this page in your wallet's browser to pay.");
    const message = `I am unlocking FREELON CITY agent #${citizenId}.`;
    const signature = (await e.request({ method: "personal_sign", params: [message, address] })) as string;
    return { address, signature };
  }

  async function getQuote() {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("awaken_started", { source: "workspace", connected: !!address });
    }
    if (!address) {
      // No injected wallet (iPhone Safari, X's in-app browser): the parent's
      // connect() falls back to alert(), which X's webview SUPPRESSES — the
      // tap looked like it did nothing (holder report 2026-06-11). Fail loud
      // and helpful inline instead, with a one-tap wallet-browser deep link.
      if (!eth()) {
        setNoWallet(true);
        // The in-app-browser dead-end (X/Safari w/o injected wallet) is a real
        // reported drop — count it so we can size how many awakens die here.
        trackEvent("unlock_blocked", { source: "workspace", reason: "no_wallet_browser" });
        return;
      }
      onConnect();
      return;
    }
    setBusy(true); setErr(null); setNote(null); setStep("quoting");
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { action: "quote", kind: "activate", ...creds } : { action: "quote", kind: "activate" }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) { creds = await sign(); continue; }
        if (res.ok && d.ok && !d.already) {
          setQuote({ amountEth: d.amountEth, amountWei: d.amountWei, toWallet: d.toWallet, expiresAt: d.expiresAt });
          setStep("await");
          // The price reveal is the highest-friction sub-step — measure quote→pay drop.
          trackEvent("awaken_quote_shown", { source: "workspace", citizenId });
          return;
        }
        if (d.already) { onUnlocked(); return; }
        setErr(d.message || d.error || "Couldn't get an unlock price. Try again."); setStep("idle");
        trackEvent("unlock_blocked", { source: "workspace", reason: "quote_error" });
        return;
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't get an unlock price."); setStep("idle");
      trackEvent("unlock_blocked", { source: "workspace", reason: "quote_error" });
    } finally { setBusy(false); }
  }

  async function claim(txHash: string) {
    let creds: { address: string; signature: string } | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const res = await fetch(`/api/citizens/${citizenId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds ? { action: "claim", kind: "activate", txHash, ...creds } : { action: "claim", kind: "activate", txHash }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401 && d?.error === "auth_required" && !creds) { creds = await sign(); continue; }
      if (res.status === 425) { setNote("Payment received — waiting for confirmations…"); await new Promise((r) => setTimeout(r, 5000)); continue; }
      if (res.ok && d.ok) {
        setNote(null);
        // THE revenue event — was dark (only fired in the unmounted dashboard).
        if (!paidRef.current) {
          paidRef.current = true;
          trackEvent("activation_paid", { source: "workspace", citizenId });
        }
        onUnlocked();
        return true;
      }
      setErr(d.message || d.error || "Couldn't confirm the unlock."); setStep("await"); setBusy(false);
      trackEvent("unlock_blocked", { source: "workspace", reason: "claim_error" });
      return false;
    }
    setErr("Still confirming on-chain. Wait a minute, then press Verify again."); setStep("await"); setBusy(false); return false;
  }

  async function pay() {
    if (!quote) return;
    const e = eth();
    if (!e || !address) { setErr("Open this page in your wallet's browser to pay."); return; }
    setBusy(true); setErr(null);
    try {
      const valueHex = "0x" + BigInt(quote.amountWei).toString(16);
      const txHash = (await e.request({ method: "eth_sendTransaction", params: [{ from: address, to: quote.toWallet, value: valueHex }] })) as string;
      setTxInput(txHash); setStep("confirming"); setNote("Payment sent — unlocking your agent…");
      await claim(txHash);
    } catch (e2) {
      setErr((e2 as Error).message || "Payment was cancelled or failed."); setBusy(false);
      trackEvent("unlock_blocked", { source: "workspace", reason: "pay_rejected" });
    }
  }

  const card: React.CSSProperties = {
    maxWidth: 480, margin: "20px auto 0", padding: "18px 18px 16px", textAlign: "left",
    border: `1px solid color-mix(in srgb, ${accent} 55%, transparent)`, borderRadius: 16,
    background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 10%, transparent), rgba(10,10,14,0.55))`,
  };
  const btn: React.CSSProperties = {
    width: "100%", marginTop: 12, padding: "13px 16px", borderRadius: 10, border: "none",
    background: accent, color: "#0a0a0c", fontFamily: "var(--mono2)", fontWeight: 700,
    fontSize: 13, letterSpacing: "0.06em", cursor: busy ? "default" : "pointer", minHeight: 46,
  };

  return (
    <div style={card}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
        ⬡ Awaken this FREELON{tier ? ` · ${tier}` : ""}
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-2, #b8b8c0)", lineHeight: 1.55, margin: "10px 0 0" }}>
        A one-time ETH awakening switches on every premium ability — strategy, research, red-team, dossier &amp; branded image generation — <strong style={{ color: "#ece9e2" }}>forever</strong>, and drops <strong style={{ color: "#ece9e2" }}>bonus ⬡</strong> in your wallet. The awakening + training history stay with the FREELON when it changes hands.
      </p>

      {step === "idle" && (
        <button type="button" style={btn} disabled={busy} onClick={getQuote}>
          {address ? `AWAKEN${priceEth ? ` · ${priceEth} ETH` : ""} →` : "CONNECT WALLET TO AWAKEN →"}
        </button>
      )}
      {step === "quoting" && <p style={{ fontSize: 12, color: "var(--ink-dim, #8a8a92)", marginTop: 12 }}>Getting your price…</p>}

      {quote && step !== "idle" && step !== "quoting" && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 30, color: accent }}>{quote.amountEth} ETH</span>
            <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim, #8a8a92)", letterSpacing: "0.12em" }}>one-time · forever{tier ? ` · ${tier}` : ""}</span>
          </div>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim, #8a8a92)", margin: "8px 0 0", wordBreak: "break-all" }}>
            Send the exact amount to <code style={{ color: "var(--ink-2, #b8b8c0)" }}>{quote.toWallet}</code>
          </p>
          {/* #36 (2026-06-27) — trust microcopy at the non-refundable checkout.
              The destination is the official awakening wallet and the payment is a
              real on-chain tx; linking it to Etherscan lets a wary buyer verify the
              address themselves before they commit. Factual, no new claim. */}
          <a
            href={`https://etherscan.io/address/${quote.toWallet}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", fontFamily: "var(--mono2)", fontSize: 11, color: accent, margin: "6px 0 0", textDecoration: "none", borderBottom: `1px solid color-mix(in srgb, ${accent} 50%, transparent)` }}
          >
            Official awakening wallet — verify it on Etherscan ↗
          </a>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "12px 0 0", fontSize: 12, color: "var(--ink-2, #b8b8c0)", cursor: "pointer" }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 2 }} />
            <span>I understand this is an on-chain, non-refundable payment.</span>
          </label>
          <button type="button" style={{ ...btn, opacity: !accepted || step === "confirming" ? 0.5 : 1 }} disabled={busy || !accepted || step === "confirming"} onClick={pay}>
            {step === "confirming" ? "AWAKENING…" : `PAY ${quote.amountEth} ETH & AWAKEN →`}
          </button>
          <div style={{ marginTop: 12, borderTop: "1px solid var(--line-2, #2a2a30)", paddingTop: 12 }}>
            <span style={{ fontSize: 11, color: "var(--ink-dim, #8a8a92)" }}>Already sent it yourself? Paste the tx hash:</span>
            <input
              placeholder="0x…"
              value={txInput}
              onChange={(e) => setTxInput(e.target.value.trim())}
              disabled={busy}
              style={{ width: "100%", marginTop: 6, padding: "9px 10px", borderRadius: 8, background: "var(--surface, #131318)", border: "1px solid var(--line-2, #2a2a30)", color: "#ece9e2", fontFamily: "var(--mono2)", fontSize: 12 }}
            />
            <button
              type="button"
              style={{ ...btn, background: "transparent", color: accent, border: `1px solid ${accent}`, opacity: !accepted || !/^0x[a-fA-F0-9]{64}$/.test(txInput) ? 0.5 : 1 }}
              disabled={busy || !accepted || !/^0x[a-fA-F0-9]{64}$/.test(txInput)}
              onClick={() => claim(txInput)}
            >
              {busy ? "VERIFYING…" : "I'VE PAID — AWAKEN →"}
            </button>
          </div>
        </>
      )}

      {noWallet && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2, #2a2a30)", background: "rgba(255,255,255,0.03)" }}>
          <p style={{ fontSize: 12, color: "var(--ink-2, #b8b8c0)", lineHeight: 1.5, margin: 0 }}>
            No crypto wallet in this browser, so the awakening can&apos;t start here.
            Open this page inside your wallet app&apos;s browser and tap AWAKEN there:
          </p>
          <a
            href={`https://metamask.app.link/dapp/${typeof window !== "undefined" ? window.location.host + window.location.pathname : ""}`}
            style={{ display: "inline-block", marginTop: 8, fontFamily: "var(--mono2)", fontSize: 12, fontWeight: 700, color: accent, textDecoration: "underline" }}
          >
            OPEN IN METAMASK →
          </a>
          <p style={{ fontSize: 11, color: "var(--ink-dim, #8a8a92)", margin: "6px 0 0" }}>
            Coinbase / Rainbow: open the app, find its browser tab, and paste this page&apos;s link.
          </p>
        </div>
      )}
      {note && <p style={{ fontSize: 12, color: accent, marginTop: 10 }}>{note}</p>}
      {err && <p style={{ fontSize: 12, color: "#e0a8a4", marginTop: 10 }}>{err}</p>}
      <p style={{ fontSize: 10.5, color: "var(--ink-dim, #6a6a72)", marginTop: 12 }}>
        On-chain &amp; non-refundable. Problem with a payment?{" "}
        <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--ink-2, #b8b8c0)" }}>DM @4040hex</a>.
      </p>
    </div>
  );
}
