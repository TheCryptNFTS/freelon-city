"use client";
/**
 * AwakenButton — owner-only paid "awaken" flow for a citizen's AI agent.
 *
 * Flow (all owner-only, self-hides for non-owners):
 *   1. GET  /api/agent/awaken/status?tokenId=   → already awakened? show badge + "Give it a job".
 *   2. dormant → "Awaken this Citizen" opens a tier picker (Spark / Signal) from /tiers.
 *   3. pick a tier → POST /quote → send the ETH wallet tx to `to` with `valueWei`
 *      (same eth_sendTransaction pattern the activation flow uses) → POST /confirm with txHash.
 *   4. success → a deterministic, trait-derived cinematic line + an immediate
 *      "Choose your first job" CTA that scrolls to the live agent surface (#run).
 *
 * Awakening is paid in ETH; HEX is spent AFTER, for jobs and training.
 * Copy is terse, no emojis (house rule: ⬡ glyph + typographic marks only).
 * Wording is "awakened / anchored / verifiable", never "immutable".
 *
 * Visuals reuse the existing agentdash-pay* / btn / kicker / realigned-badge
 * classes so this matches the rest of the citizen page.
 */
import { useEffect, useState } from "react";
import { getCitizen } from "@/lib/citizens";
import { CIVILIZATIONS } from "@/lib/constants";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";

type Tier = { key: string; label: string; eth: number; blurb: string };
type Quote = { quoteId: string; to: string; valueWei: string; eth: number; expiresAt: number };
type Status = {
  tokenId: number;
  awakened: boolean;
  awakenTier?: string | null;
  awakenedAt?: number | null;
  awakenBlock?: number | null;
};
type Confirmed = {
  ok: boolean;
  awakened: boolean;
  tier: string;
  awakenedAt: number;
  block: number;
  txHash: string;
};

type Step = "idle" | "picking" | "quoting" | "await" | "confirming" | "done";

type Props = { citizenId: number };

/** Deterministic (no-LLM) success line built from the citizen's own traits. */
function awakenLine(citizenId: number): string {
  const id4 = citizenId.toString().padStart(4, "0");
  const c = getCitizen(citizenId);
  const civ = c
    ? (CIVILIZATIONS as Record<string, { name: string }>)[c.civilization]?.name ?? c.civilization
    : "the City";
  return `Signal restored. I am Citizen #${id4} of ${civ}. Give me a task.`;
}

/** Pretty tier label from its key/label (e.g. "signal" → "Signal"). */
function tierLabel(tiers: Tier[] | null, key: string | null | undefined): string {
  if (!key) return "";
  const t = tiers?.find((x) => x.key === key);
  if (t?.label) return t.label;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function AwakenButton({ citizenId }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);

  const [status, setStatus] = useState<Status | null>(null);
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [chosen, setChosen] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [result, setResult] = useState<Confirmed | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const r = await fetch(`/api/agent/awaken/status?tokenId=${citizenId}`, { cache: "no-store" });
      if (r.ok) setStatus((await r.json()) as Status);
    } catch {
      /* non-fatal — the button falls back to the dormant state */
    }
  }

  // Status: needed for everyone (drives awakened vs dormant). Tiers: only the
  // owner ever sees the picker, so load lazily but it's cheap.
  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenId]);

  useEffect(() => {
    if (!o.isOwner || tiers) return;
    let cancelled = false;
    fetch(`/api/agent/awaken/tiers`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d?.tiers)) setTiers(d.tiers as Tier[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [o.isOwner, tiers]);

  // Owner-only surface. Hide entirely for non-owners (and while resolving).
  if (h.loading || o.loading || !o.isOwner) return null;

  const awakened = !!status?.awakened || step === "done";
  const liveTier = result?.tier ?? status?.awakenTier ?? chosen ?? null;
  const liveBlock = result?.block ?? status?.awakenBlock ?? null;

  /** Scroll to the live agent surface (the dashboard mounts with id="run"). */
  function goToFirstJob() {
    const el = typeof document !== "undefined" ? document.getElementById("run") : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------------------------------------------------------- AWAKENED
  if (awakened) {
    const label = tierLabel(tiers, liveTier);
    return (
      <section className="agentdash" id="awaken">
        {/* Success / steady-state. After a fresh confirm we show the cinematic
            line + block; on a return visit we just show the badge + CTA. */}
        {result ? (
          <>
            <span className="kicker">⬡ SIGNAL RESTORED</span>
            <p className="agentdash-lockhero-sub" style={{ margin: "10px 0 6px" }}>
              {awakenLine(citizenId)}
            </p>
            <p className="agentdash-pay-note">
              Awakened on Ethereum{liveBlock != null ? ` · block #${liveBlock}` : ""}.
            </p>
          </>
        ) : (
          <span className="kicker">⬡ ON-CHAIN AGENT</span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <span className="realigned-badge" style={{ margin: 0 }}>
            ⬡ AWAKENED{label ? ` · ${label.toUpperCase()}` : ""}
          </span>
          <button type="button" className="btn btn-primary agentdash-go" onClick={goToFirstJob}>
            <span className="ttl">{result ? "CHOOSE YOUR FIRST JOB →" : "GIVE IT A JOB →"}</span>
          </button>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------- DORMANT
  async function chooseTier(key: string) {
    setChosen(key);
    setErr(null);
    setBusy(true);
    setStep("quoting");
    try {
      const r = await fetch(`/api/agent/awaken/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: citizenId, tier: key }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.valueWei && d?.to) {
        setQuote(d as Quote);
        setStep("await");
      } else {
        setErr(d?.message || d?.error || "Couldn't get an awaken price. Try again.");
        setStep("picking");
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't get an awaken price.");
      setStep("picking");
    } finally {
      setBusy(false);
    }
  }

  async function payAndConfirm() {
    if (!quote || !chosen) return;
    if (typeof window === "undefined" || !window.ethereum) {
      setErr("Open this page in your wallet's browser to awaken.");
      return;
    }
    if (!h.address) {
      setErr("Connect the wallet that holds this citizen.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      // Same eth_sendTransaction pattern the agent activation flow uses: hex-encode
      // the wei value and send to the quoted `to` address.
      const valueHex = "0x" + BigInt(quote.valueWei).toString(16);
      const txHash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: h.address, to: quote.to, value: valueHex }],
      })) as string;

      setStep("confirming");
      const r = await fetch(`/api/agent/awaken/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: citizenId, tier: chosen, txHash }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok && d?.awakened) {
        setResult(d as Confirmed);
        setStep("done");
        void loadStatus();
      } else {
        setErr(d?.message || d?.error || "Payment sent, but the awaken couldn't be confirmed yet. Refresh in a moment.");
        setStep("await");
      }
    } catch (e) {
      setErr((e as Error).message || "Awaken was cancelled or failed.");
      setStep("await");
    } finally {
      setBusy(false);
    }
  }

  const recommended = "signal"; // Signal tier is marked recommended.

  return (
    <section className="agentdash" id="awaken">
      <span className="kicker">⬡ ON-CHAIN AGENT · DORMANT</span>
      <p className="agentdash-lockhero-sub" style={{ margin: "10px 0 14px", maxWidth: 460 }}>
        Awaken this citizen to turn it into an active AI agent — anchored on-chain, verifiable, and
        ready for its first job.
      </p>
      <p className="agentdash-pay-note" style={{ marginTop: 0 }}>
        Awakening is paid in ETH. HEX is used after, for jobs and training.
      </p>

      {step === "idle" && (
        <button
          type="button"
          className="btn btn-primary agentdash-go"
          style={{ marginTop: "var(--s-3)" }}
          onClick={() => {
            setErr(null);
            setStep("picking");
          }}
        >
          <span className="ttl">AWAKEN THIS CITIZEN →</span>
        </button>
      )}

      {/* TIER PICKER */}
      {(step === "picking" || step === "quoting") && (
        <div className="agentdash-pay" style={{ marginTop: "var(--s-3)" }}>
          <div className="agentdash-pay-hd">
            <span className="kicker">⬡ CHOOSE A TIER</span>
            <button
              type="button"
              className="agentdash-pay-cancel"
              onClick={() => {
                setStep("idle");
                setChosen(null);
                setErr(null);
              }}
              disabled={busy}
            >
              CANCEL
            </button>
          </div>
          {tiers === null ? (
            <p className="agentdash-pay-note">Loading tiers…</p>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: "var(--s-3)" }}>
              {tiers.map((t) => {
                const isRec = t.key === recommended;
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={`btn${isRec ? " btn-primary" : ""}`}
                    disabled={busy}
                    onClick={() => chooseTier(t.key)}
                    style={{ textAlign: "left", display: "block", padding: "12px 14px" }}
                  >
                    <span
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="ttl">
                        {t.label.toUpperCase()}
                        {isRec ? " · RECOMMENDED" : ""}
                      </span>
                      <span style={{ fontFamily: "var(--mono2)", color: "var(--gold)" }}>
                        {t.eth} ETH
                      </span>
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontFamily: "var(--mono2)",
                        fontSize: 12,
                        color: "var(--ink-2)",
                        lineHeight: 1.5,
                        whiteSpace: "normal",
                      }}
                    >
                      {t.blurb}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {step === "quoting" && <p className="agentdash-pay-note">Getting the price…</p>}
          {err && <p className="agentdash-err">{err}</p>}
        </div>
      )}

      {/* QUOTE → PAY */}
      {(step === "await" || step === "confirming") && quote && (
        <div className="agentdash-pay" style={{ marginTop: "var(--s-3)" }}>
          <div className="agentdash-pay-hd">
            <span className="kicker">⬡ AWAKEN · {tierLabel(tiers, chosen).toUpperCase()}</span>
            <button
              type="button"
              className="agentdash-pay-cancel"
              onClick={() => {
                setStep("picking");
                setQuote(null);
                setErr(null);
              }}
              disabled={busy}
            >
              BACK
            </button>
          </div>
          <div className="agentdash-pay-amount">
            <span className="agentdash-pay-eth">{quote.eth} ETH</span>
            <span className="agentdash-pay-usd">one-time · awaken</span>
          </div>
          <p className="agentdash-pay-to">
            Paid in ETH to<br />
            <code>{quote.to}</code>
          </p>
          <button
            type="button"
            className="btn btn-primary agentdash-go"
            disabled={busy || step === "confirming"}
            onClick={payAndConfirm}
          >
            <span className="ttl">
              {step === "confirming" ? "AWAKENING…" : `PAY ${quote.eth} ETH & AWAKEN →`}
            </span>
          </button>
          {err && <p className="agentdash-err">{err}</p>}
          <p className="agentdash-pay-support">
            Payments are on-chain &amp; non-refundable. Problem with a payment?{" "}
            <a href="https://x.com/4040hex" target="_blank" rel="noreferrer">DM @4040hex</a> — we&apos;ll sort it.
          </p>
        </div>
      )}
    </section>
  );
}
