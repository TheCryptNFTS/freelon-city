"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/track";
import { tweetIntent } from "@/lib/share";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Outbound share link — a /demo?ref= link so inbound traffic from it is
// measurable (ReferralBeacon fires referral_landing). This is the off-platform
// loop: the post lives on someone else's timeline, the ref proves it worked.
const SHARE_URL = "https://freeloncity.com/demo?ref=share";
const SHARE_TEXT =
  "I just met my FREELON — an AI character you own and train, and it remembers you. Meet yours, free:";

/**
 * "Claim this FREELON" — on-site, non-binding reservation. Replaces the demo
 * wall's invisible hand-off to OpenSea (where conversion died and we learned
 * nothing) with a capture we can SEE and follow up on. Email required, wallet
 * optional. The referral code is read from the ?ref= the visitor arrived through
 * so we can measure which shared links drive interest. See app/api/reserve.
 */
export function ClaimForm({
  tokenId,
  slug,
  accent = "var(--gold)",
}: {
  tokenId?: number;
  slug?: string;
  accent?: string;
}) {
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [showWallet, setShowWallet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!EMAIL_RE.test(em)) {
      setError("Enter a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    let ref: string | null = null;
    try {
      ref = new URLSearchParams(window.location.search).get("ref");
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, wallet: wallet.trim() || undefined, tokenId, slug, ref }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (res.ok && data.ok) {
        setDone(true);
        trackEvent("reserve_submitted", { ref: ref || "none", slug: slug || "freelons" });
      } else {
        setError(data.message || "Couldn't save that — try again.");
      }
    } catch {
      setError("Couldn't reach the city — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--display)", fontSize: 20, color: "var(--ink)", lineHeight: 1.2, marginBottom: 8 }}>
          You&apos;re on the list.
        </div>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 16 }}>
          We&apos;ll reach out about claiming your FREELON. No payment, nothing locked — and we&apos;ll never
          ask for a seed phrase.
        </p>
        <a
          href={tweetIntent(`${SHARE_TEXT} ${SHARE_URL}`)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("share_clicked", { from: "claim_done" })}
          style={{
            display: "inline-block",
            fontFamily: "var(--mono2)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink)",
            border: "1px solid var(--line-2)",
            borderRadius: 10,
            padding: "10px 20px",
            textDecoration: "none",
          }}
        >
          Tell someone →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      {error && (
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11.5, color: "#e0a8a4", textAlign: "center" }}>{error}</div>
      )}
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        maxLength={200}
        disabled={busy}
        style={{
          fontFamily: "var(--mono2)",
          fontSize: 14,
          color: "var(--ink)",
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: 10,
          padding: "12px 14px",
          outline: "none",
        }}
      />
      {showWallet ? (
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x… (optional)"
          maxLength={42}
          disabled={busy}
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 10,
            padding: "11px 14px",
            outline: "none",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowWallet(true)}
          style={{
            alignSelf: "center",
            fontFamily: "var(--mono2)",
            fontSize: 11,
            color: "var(--ink-dim)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          + add wallet (optional)
        </button>
      )}
      <button
        type="submit"
        disabled={busy || !email.trim()}
        style={{
          fontFamily: "var(--mono2)",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--bg)",
          background: email.trim() && !busy ? accent : "var(--line-2)",
          border: "none",
          borderRadius: 10,
          padding: "13px 26px",
          cursor: email.trim() && !busy ? "pointer" : "default",
        }}
      >
        {busy ? "Saving…" : "Claim this FREELON →"}
      </button>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 10.5, color: "var(--ink-dim)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
        Non-binding · no payment · we&apos;ll never ask for a seed phrase
      </p>
    </form>
  );
}
