"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { imageUrl } from "@/lib/constants";

/**
 * EVOLVE PANEL — owner-only, OPT-IN, REVERTABLE art evolution.
 *
 * The original art is ALWAYS preserved: evolving renders new art server-side,
 * reverting flips back to the original instantly. Self-hides for non-owners.
 *
 * Auth reuses the dashboard pattern: read the connected wallet via useHolder,
 * gate ownership via useOwnsCitizen, and on a 401 `auth_required` from the
 * owner-gated POST, sign a personal_sign message and retry once.
 */

type Props = { citizenId: number };

// Backend contract (built in parallel — do not change these shapes):
type Status = {
  tokenId: number;
  evolved: boolean;
  tier: number | null;
  evolvedImageUrl: string | null;
  canEvolve: boolean;
  nextTier: number | null;
  reason: string | null;
};
type EvolveResult = { ok: boolean; evolved: boolean; tier: number | null; evolvedImageUrl: string | null; message?: string; error?: string };
type RevertResult = { ok: boolean; evolved: boolean; message?: string; error?: string };

type View = "original" | "evolved";

export function EvolvePanel({ citizenId }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);

  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>("evolved");

  const originalUrl = imageUrl(citizenId);

  // Pull evolve status once we've confirmed the connected wallet owns this
  // citizen. Fail-quiet — a status hiccup just leaves the panel hidden.
  useEffect(() => {
    if (!o.isOwner) return;
    let cancelled = false;
    fetch(`/api/agent/evolve/status?tokenId=${citizenId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Status) => {
        if (cancelled || typeof d?.tokenId !== "number") return;
        setStatus(d);
        setView(d.evolved ? "evolved" : "original");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [o.isOwner, citizenId]);

  /** Sign the owner message when the route demands wallet auth (no bound session). */
  async function signOrThrow(message: string): Promise<{ address: string; signature: string }> {
    if (!window.ethereum) throw new Error("Open this page in your wallet's browser (a signature is required).");
    if (!h.address) throw new Error("Connect your wallet first.");
    const signature = (await window.ethereum.request({ method: "personal_sign", params: [message, h.address] })) as string;
    return { address: h.address, signature };
  }

  /** Opt in: sign, POST /evolve, then show the new art. Render takes ~20-40s. */
  async function doEvolve() {
    if (busy || reverting) return;
    setBusy(true); setErr(null);
    const base: Record<string, unknown> = { tokenId: citizenId };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch("/api/agent/evolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = (await res.json().catch(() => ({}))) as EvolveResult;
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am evolving FREELON CITY citizen #${citizenId}. My original is preserved.`);
          continue;
        }
        if (res.ok && d?.ok && d.evolved) {
          setStatus((s) => ({
            tokenId: citizenId,
            evolved: true,
            tier: d.tier,
            evolvedImageUrl: d.evolvedImageUrl,
            canEvolve: false,
            nextTier: s?.nextTier ?? null,
            reason: null,
          }));
          setView("evolved");
        } else {
          setErr(d?.message || d?.error || "Couldn't evolve the art — nothing changed, your original is safe.");
        }
        return;
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't evolve the art.");
    } finally {
      setBusy(false);
    }
  }

  /** Revert to the original art (always available once evolved). */
  async function doRevert() {
    if (busy || reverting) return;
    setReverting(true); setErr(null);
    const base: Record<string, unknown> = { tokenId: citizenId };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch("/api/agent/evolve/revert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = (await res.json().catch(() => ({}))) as RevertResult;
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am reverting FREELON CITY citizen #${citizenId} to its original.`);
          continue;
        }
        if (res.ok && d?.ok && !d.evolved) {
          setStatus((s) => (s ? { ...s, evolved: false, evolvedImageUrl: s.evolvedImageUrl, canEvolve: true } : s));
          setView("original");
        } else {
          setErr(d?.message || d?.error || "Couldn't revert. Try again.");
        }
        return;
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't revert.");
    } finally {
      setReverting(false);
    }
  }

  // Non-owners / still-resolving / no status → render nothing (self-hide).
  if (o.loading || h.loading) return null;
  if (!o.isOwner) return null;
  if (!status) return null;

  const evolvedUrl = status.evolvedImageUrl;
  const shownUrl = view === "evolved" && evolvedUrl ? evolvedUrl : originalUrl;

  // Before/after toggle — shown whenever there's evolved art to compare.
  const toggle = (status.evolved && evolvedUrl) ? (
    <div className="agentdash-tasks" role="group" aria-label="Compare original and evolved">
      <button
        type="button"
        className={`agentdash-task${view === "original" ? " is-active" : ""}`}
        onClick={() => setView("original")}
      >
        ORIGINAL
      </button>
      <button
        type="button"
        className={`agentdash-task${view === "evolved" ? " is-active" : ""}`}
        onClick={() => setView("evolved")}
      >
        ⬡ EVOLVED
      </button>
    </div>
  ) : null;

  return (
    <section className="agentdash" id="evolve">
      <div className="agentdash-hd">
        <span className="kicker">⬡ EVOLVE THIS CITIZEN&apos;S ART</span>
        {status.evolved && status.tier != null && (
          <span className="agentdash-credits" title="This citizen's art is awakened. Your original is always preserved.">
            ⬡ AWAKENED · TIER {status.tier}
          </span>
        )}
      </div>

      {/* LOCKED — not evolvable yet. Subtle, no CTA, just the reason. */}
      {!status.evolved && !status.canEvolve && (
        <p className="agentdash-locked-msg">
          {status.reason || "Evolves at the next tier — keep training."}
        </p>
      )}

      {/* OPT-IN — evolvable, not yet evolved. */}
      {!status.evolved && status.canEvolve && (
        <div className="agentdash-images">
          <p className="agentdash-images-sub">
            Optional &amp; additive: awaken your citizen&apos;s art at its current tier. It&apos;s fully
            <strong> revertable</strong> — your original is always preserved.
          </p>
          <p className="agentdash-images-sub">
            {status.reason || "Costs ⬡. Your original art stays untouched and you can revert any time."}
          </p>
          <figure className="agentdash-image-out">
            <span className="agentdash-image-cap">ORIGINAL</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={originalUrl} alt={`Citizen #${citizenId.toString().padStart(4, "0")} original`} className="agentdash-image-img" />
          </figure>
          <button className="btn btn-primary agentdash-go" type="button" disabled={busy} onClick={doEvolve}>
            <span className="ttl">{busy ? "EVOLVING… (~20-40s)" : "⬡ EVOLVE ART →"}</span>
          </button>
          {busy && <p className="agentdash-images-sub">Rendering new art — this takes ~20-40s. Your original is safe.</p>}
          {err && <p className="agentdash-err">{err}</p>}
        </div>
      )}

      {/* EVOLVED — show the new art, before/after toggle + revert. */}
      {status.evolved && (
        <div className="agentdash-images">
          <p className="agentdash-images-sub">
            Your citizen&apos;s art is awakened. <strong>Your original is always preserved</strong> — revert any time.
          </p>
          {toggle}
          <figure className="agentdash-image-out">
            <span className="agentdash-image-cap">{view === "evolved" && evolvedUrl ? `⬡ EVOLVED · TIER ${status.tier ?? ""}`.trim() : "ORIGINAL"}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shownUrl}
              alt={`Citizen #${citizenId.toString().padStart(4, "0")} ${view}`}
              className="agentdash-image-img"
            />
          </figure>
          <div className="agentdash-image-actions">
            <button className="btn agentdash-outbtn" type="button" disabled={reverting || busy} onClick={doRevert}>
              <span className="ttl">{reverting ? "REVERTING…" : "REVERT TO ORIGINAL"}</span>
            </button>
            {evolvedUrl && (
              <a className="btn agentdash-outbtn" href={evolvedUrl} target="_blank" rel="noreferrer">OPEN EVOLVED ↗</a>
            )}
          </div>
          {err && <p className="agentdash-err">{err}</p>}
        </div>
      )}
    </section>
  );
}
