"use client";
/**
 * <ReplySubmit /> — carrier paste-in form for claiming reply hex.
 *
 * Workflow:
 *   1. Carrier replies to a @4040hex post on X.
 *   2. They copy the URL of their reply tweet.
 *   3. They paste it here, hit CLAIM, get +15 ⬡ (or +30 ⬡ if first 10
 *      in 30 min).
 *   4. 24h later a cron scan checks the reply's like count and credits
 *      +50 ⬡ bonus if it earned ≥3 likes.
 *
 * Auth: needs a wallet + bound X session (same gate as /api/claim).
 */
import { useState } from "react";
import { useViewerAddr } from "@/lib/use-viewer";

type Result = {
  ok: boolean;
  credited?: number;
  burstWinner?: boolean;
  eligibleForBonus?: boolean;
  bonusAmount?: number;
  bonusCheckIn?: string;
  bonusThreshold?: number;
  dailyRepliesUsed?: number;
  dailyCap?: number;
  error?: string;
  expected?: string;
};

export function ReplySubmit() {
  const viewer = useViewerAddr();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!viewer.addr) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addr: viewer.addr, replyUrl: url.trim() }),
      });
      const j = await r.json();
      setResult({ ok: r.ok, ...j });
      if (r.ok) setUrl("");
    } catch {
      setResult({ ok: false, error: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  const errMap: Record<string, string> = {
    bad_origin: "BAD ORIGIN — REFRESH AND TRY AGAIN",
    invalid_address: "WALLET ADDRESS INVALID",
    session_required: "SIGN IN WITH X (BOUND TO THIS WALLET) FIRST",
    wallet_proof_required: "SIGN ONCE WITH YOUR WALLET (CONNECT ON /SYNC) TO EARN ⬡",
    invalid_url: "URL MUST BE A TWITTER / X TWEET URL",
    handle_mismatch: "URL HANDLE DOESN'T MATCH YOUR BOUND X HANDLE",
    author_mismatch: "TWEET AUTHOR DOESN'T MATCH YOUR BOUND X HANDLE",
    not_a_reply: "THAT TWEET IS NOT A REPLY",
    // 2026-05-26 — the unhelpful original copy ("THAT REPLY IS NOT
    // TO A @4040hex POST") confused holders who HAD replied to
    // @4040hex but to a tweet the city's autopost tracker hadn't
    // registered. New copy explains both possibilities so the holder
    // can either retry on a tracked post or report a missing one.
    parent_not_recognized:
      "REPLY MUST BE TO ONE OF @4040hex's RECENT AUTOPOSTED TWEETS (daily signal, sweep burst, weekly receipts). REPLIES TO MANUAL TWEETS DON'T EARN.",
    already_submitted: "ALREADY CLAIMED FOR THIS REPLY",
    daily_cap: "DAILY REPLY CAP HIT — COME BACK TOMORROW",
  };

  return (
    <article
      style={{
        padding: "var(--s-4) var(--s-5)",
        border: "1px solid var(--gold)",
        background: "linear-gradient(135deg, rgba(200,167,93,0.10), rgba(200,167,93,0.02))",
        borderRadius: 14,
        marginBottom: "var(--s-4)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold)", textTransform: "uppercase" }}>
          ⬡ REPLIED TO @4040hex? CLAIM IT.
        </span>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em" }}>
          +15 ⬡ · BURST 2× · +50 ⬡ IF ≥3 LIKES
        </span>
      </div>

      <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55, margin: "10px 0 14px" }}>
        Reply to any @4040hex post. Paste your reply URL below.
        The X algorithm weighs replies 270× a like — the city pays you for moving them.
      </p>

      {!viewer.addr ? (
        <div style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.14em" }}>
          Connect a wallet (or paste-sync your address) to claim.
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://x.com/yourhandle/status/1234567890"
            required
            disabled={busy}
            style={{
              flex: 1,
              minWidth: 220,
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: "var(--mono2)",
              color: "var(--ink)",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid var(--line-2)",
              borderRadius: 8,
            }}
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="btn btn-primary"
            style={{ minWidth: 140 }}
          >
            <span className="ttl">{busy ? "VERIFYING…" : "CLAIM HEX →"}</span>
          </button>
        </form>
      )}

      {result && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.6,
          background: result.ok ? "rgba(122,224,141,0.08)" : "rgba(255,90,77,0.08)",
          border: `1px solid ${result.ok ? "#7AE08D55" : "#FF5A4D55"}`,
          color: result.ok ? "#9ad4a8" : "var(--state-danger)",
        }}>
          {result.ok ? (
            <>
              <strong>✓ +{result.credited} ⬡ credited.</strong>
              {result.burstWinner && (
                <> ⬢ BURST ×2 — landed in the first 30-min window.</>
              )}
              <br />
              {result.eligibleForBonus && (
                <span style={{ color: "var(--ink-2)" }}>
                  Bonus +{result.bonusAmount} ⬡ check in {result.bonusCheckIn} —
                  needs ≥{result.bonusThreshold} likes.
                </span>
              )}
              <br />
              <span style={{ color: "var(--ink-dim)" }}>
                Daily replies: {result.dailyRepliesUsed} / {result.dailyCap}
              </span>
            </>
          ) : (
            <>
              {errMap[result.error || ""] || `ERROR · ${result.error || "unknown"}`}
              {result.expected && <div>Expected: <code>{result.expected}</code></div>}
            </>
          )}
        </div>
      )}
    </article>
  );
}
