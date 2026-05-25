"use client";
/**
 * <SignalInventoryPanel /> — CHECK YOUR SIGNAL.
 *
 * Founder brief 2026-05-25 (visual polish round, no behavior changes):
 *   "Make the ownership terminal feel premium, cinematic, integrated
 *    into the FREELON CITY archive world. Not OpenSea-lite. Not a
 *    crypto dashboard. Restrained glow. Dark archive terminal. Subtle
 *    hex geometry. Strong spacing. Premium card hierarchy."
 *
 * UX language locked: Signal Inventory · Connected · Not Yet Connected
 *                     · Recovered Artefacts · Archive Layer.
 * Banned: portfolio · assets · floor · value · trade · market.
 *
 * Behavior unchanged from prior round:
 *   - auto-fill from freelon_addr cookie
 *   - paste-address scan
 *   - parallel /api/wallet/[addr]/inventory call
 *   - per-collection cards with thumbnails + status pills
 *   - elegant empty + error states
 */

import { useEffect, useMemo, useState } from "react";
import type { SignalInventory } from "@/lib/signal-inventory";

function readAddrCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
  if (!m) return null;
  const val = decodeURIComponent(m[1]).toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(val)) return null;
  return val;
}

type Status = "idle" | "loading" | "ok" | "error";

function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

export function SignalInventoryPanel() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SignalInventory | null>(null);

  useEffect(() => {
    const cookie = readAddrCookie();
    if (cookie) {
      setInput(cookie);
      void scan(cookie);
    }
  }, []);

  async function scan(raw: string) {
    const addr = raw.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) {
      setErr("Provide a valid 0x… Ethereum address.");
      setStatus("error");
      return;
    }
    setErr(null);
    setStatus("loading");
    setData(null);
    try {
      const r = await fetch(`/api/wallet/${addr}/inventory`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || `Scan failed (${r.status})`);
        setStatus("error");
        return;
      }
      const j = (await r.json()) as SignalInventory;
      setData(j);
      setStatus("ok");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "network_error");
      setStatus("error");
    }
  }

  const totalArtefacts = useMemo(
    () => (data?.collections ?? []).reduce((a, c) => a + c.count, 0),
    [data],
  );
  const filledCollections = useMemo(
    () => (data?.collections ?? []).filter((c) => c.count > 0),
    [data],
  );
  const emptyCollections = useMemo(
    () => (data?.collections ?? []).filter((c) => c.count === 0),
    [data],
  );

  return (
    <section className="sig-inv">
      {/* HEADER — classified-terminal kicker + hex glyph spine */}
      <div className="sig-inv__header">
        <span className="sig-inv__kicker">
          <span className="sig-inv__glyph" aria-hidden>⬡</span>
          CHECK YOUR SIGNAL · ARCHIVE TERMINAL
        </span>
        <h2 className="sig-inv__title">
          Which <em>archive layers</em><br />
          are connected to you?
        </h2>
        <p className="sig-inv__lede">
          Paste a wallet. The city reads every connected archive and
          returns the artefacts you carry.
        </p>
      </div>

      {/* INPUT — single-line classified terminal feel */}
      <form
        className="sig-inv__form"
        onSubmit={(e) => { e.preventDefault(); void scan(input); }}
      >
        <div className="sig-inv__inputWrap">
          <span className="sig-inv__inputPrefix" aria-hidden>0x</span>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="paste address · 40 chars"
            value={input.replace(/^0x/i, "")}
            onChange={(e) => setInput("0x" + e.target.value.trim().replace(/^0x/i, ""))}
            disabled={status === "loading"}
            className="sig-inv__input"
            aria-label="Wallet address"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || input.length < 5}
          className="sig-inv__scanBtn"
          data-loading={status === "loading" ? "1" : undefined}
        >
          <span className="sig-inv__scanLabel">
            {status === "loading" ? "READING SIGNAL…" : "SCAN WALLET →"}
          </span>
        </button>
      </form>

      {err && status === "error" && (
        <p className="sig-inv__err">⚠ {err}</p>
      )}

      {/* LOADING — terminal-style scanning sweep */}
      {status === "loading" && (
        <div className="sig-inv__loading" aria-label="Reading signal across archives">
          <div className="sig-inv__loadingGrid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sig-inv__loadingCell" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <p className="sig-inv__loadingLabel">⬡ READING ACROSS 6 ARCHIVE LAYERS…</p>
        </div>
      )}

      {/* RESULT */}
      {status === "ok" && data && (
        <div className="sig-inv__result">
          {/* Summary strip */}
          <div className="sig-inv__summary">
            <span className="sig-inv__summaryWallet">
              <span className="sig-inv__summaryDot" aria-hidden />
              SIGNAL READ · {shortAddr(data.address)}
            </span>
            <span className="sig-inv__summaryStats">
              <strong>{totalArtefacts}</strong> recovered artefact{totalArtefacts === 1 ? "" : "s"}
              <span className="sig-inv__sep">·</span>
              <strong>{filledCollections.length}</strong> of {data.collections.length} archives connected
            </span>
          </div>

          {/* Empty state */}
          {totalArtefacts === 0 && (
            <div className="sig-inv__empty">
              <div className="sig-inv__emptyGlyph" aria-hidden>⬡</div>
              <p className="sig-inv__emptyTitle">No signal detected.</p>
              <p className="sig-inv__emptyBody">
                The city does not yet recognise this wallet across any
                connected archive. The signal waits.
              </p>
            </div>
          )}

          {/* Connected archives */}
          {filledCollections.length > 0 && (
            <div className="sig-inv__archives">
              {filledCollections.map((c) => (
                <article
                  key={c.collection.slug}
                  className="sig-inv__archive"
                  style={{ ["--archive-color" as string]: c.collection.color }}
                >
                  {/* Left rail: archive identity */}
                  <header className="sig-inv__archiveHead">
                    <div className="sig-inv__archiveMeta">
                      <span className="sig-inv__archiveRole">
                        <span className="sig-inv__archiveGlyph" aria-hidden>⬡</span>
                        {c.collection.role.toUpperCase()}
                      </span>
                      <div className="sig-inv__archiveName">{c.collection.name}</div>
                      <div className="sig-inv__archiveStatus">
                        ● CONNECTED · ARCHIVE LAYER ACTIVE
                      </div>
                    </div>
                    <div className="sig-inv__archiveCount">
                      <span className="sig-inv__archiveCountNum">
                        {c.count}{c.truncated && <span className="sig-inv__archiveCountPlus">+</span>}
                      </span>
                      <span className="sig-inv__archiveCountLabel">
                        recovered
                      </span>
                    </div>
                  </header>

                  {/* Artefact thumbnails */}
                  <div className="sig-inv__artefacts">
                    {c.items.slice(0, 12).map((it) => (
                      <a
                        key={it.identifier}
                        href={it.openseaUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={it.name || `${c.collection.name} #${it.identifier}`}
                        className="sig-inv__artefact"
                      >
                        {it.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.imageUrl} alt="" loading="lazy" className="sig-inv__artefactImg" />
                        ) : (
                          <span className="sig-inv__artefactPlaceholder" aria-hidden>⬡</span>
                        )}
                        <span className="sig-inv__artefactId">#{it.identifier}</span>
                      </a>
                    ))}
                  </div>

                  {c.items.length > 12 && (
                    <p className="sig-inv__archiveMore">
                      <span>SHOWING 12 OF {c.count}</span>
                      <a
                        href={`https://opensea.io/${data.address}?search[collections][0]=${c.collection.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="sig-inv__archiveMoreLink"
                      >
                        VIEW ALL ↗
                      </a>
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Not yet connected — quiet, not a sales pitch */}
          {emptyCollections.length > 0 && (
            <div className="sig-inv__notConnected">
              <span className="sig-inv__notConnectedKicker">
                ⬡ NOT YET CONNECTED
              </span>
              <div className="sig-inv__notConnectedList">
                {emptyCollections.map((c) => {
                  const failed = c.status === "rate_limited" || c.status === "error";
                  return (
                    <span
                      key={c.collection.slug}
                      className="sig-inv__notConnectedChip"
                      data-status={c.status}
                      title={`${c.collection.name} · ${c.collection.role}${
                        c.status === "rate_limited" ? " · scan rate-limited, retry shortly"
                          : c.status === "error" ? " · scan failed, retry shortly" : ""
                      }`}
                    >
                      <span className="sig-inv__notConnectedDot" aria-hidden />
                      {c.collection.name}
                      {failed && <span className="sig-inv__notConnectedWarn">⚠</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        /* ───────────────────────── PANEL SHELL ───────────────────────── */
        .sig-inv {
          position: relative;
          margin: var(--s-6) 0;
          padding: clamp(20px, 4vw, 36px);
          border: 1px solid rgba(200, 167, 93, 0.32);
          background:
            radial-gradient(ellipse 100% 50% at 50% 0%, rgba(200,167,93,0.10), transparent 70%),
            linear-gradient(180deg, rgba(8, 10, 14, 0.96), rgba(8, 10, 14, 0.86));
          border-radius: 14px;
          overflow: hidden;
        }
        /* Subtle hex blueprint texture — restrained, low alpha */
        .sig-inv::before {
          content: "";
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(200,167,93,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,167,93,0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%);
        }
        .sig-inv > * { position: relative; }

        /* ───────────────────────── HEADER ───────────────────────── */
        .sig-inv__header { margin-bottom: var(--s-4); }
        .sig-inv__kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border: 1px solid rgba(200, 167, 93, 0.4);
          border-radius: 999px;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 700;
          background: rgba(200, 167, 93, 0.06);
        }
        .sig-inv__glyph {
          font-size: 11px;
          opacity: 0.9;
          animation: sigPulse 2.4s ease-in-out infinite;
        }
        @keyframes sigPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .sig-inv__title {
          font-family: var(--display);
          font-size: clamp(28px, 4.5vw, 46px);
          line-height: 1;
          letter-spacing: -0.015em;
          margin: 12px 0 8px;
          color: var(--ink);
        }
        .sig-inv__title em {
          color: var(--gold);
          font-style: normal;
        }
        .sig-inv__lede {
          font-family: var(--mono2);
          font-size: 13px;
          color: var(--ink-2);
          line-height: 1.65;
          margin: 0;
          max-width: 540px;
        }

        /* ───────────────────────── INPUT ───────────────────────── */
        .sig-inv__form {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: var(--s-4) 0 var(--s-2);
        }
        .sig-inv__inputWrap {
          flex: 1 1 320px;
          display: flex;
          align-items: stretch;
          border: 1px solid var(--line-2);
          background: rgba(0, 0, 0, 0.55);
          border-radius: 10px;
          overflow: hidden;
          min-height: 48px;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }
        .sig-inv__inputWrap:focus-within {
          border-color: var(--gold);
          box-shadow: 0 0 0 1px rgba(200,167,93,0.35), 0 0 24px -8px rgba(200,167,93,0.5);
        }
        .sig-inv__inputPrefix {
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          font-family: var(--mono2);
          font-size: 13px;
          color: var(--ink-dim);
          letter-spacing: 0.12em;
          background: rgba(255, 255, 255, 0.03);
          border-right: 1px solid var(--line);
        }
        .sig-inv__input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--ink);
          font-family: var(--mono2);
          font-size: 14px;
          letter-spacing: 0.05em;
          padding: 0 14px;
          outline: none;
          min-width: 0;
        }
        .sig-inv__input::placeholder {
          color: var(--ink-fade);
        }
        .sig-inv__scanBtn {
          flex: 0 0 auto;
          padding: 0 22px;
          min-height: 48px;
          min-width: 180px;
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          color: #0a0a0c;
          border: none;
          border-radius: 10px;
          font-family: var(--mono2);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 240ms ease, opacity 140ms ease;
          position: relative;
          overflow: hidden;
        }
        .sig-inv__scanBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 40px -12px rgba(200,167,93,0.5);
        }
        .sig-inv__scanBtn:disabled { opacity: 0.55; cursor: default; }
        .sig-inv__scanBtn[data-loading="1"]::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,0.18), transparent);
          animation: sigSweep 1.3s linear infinite;
        }
        @keyframes sigSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .sig-inv__scanLabel { position: relative; z-index: 1; }

        .sig-inv__err {
          margin: 12px 0 0;
          padding: 10px 14px;
          border: 1px solid rgba(255,138,110,0.45);
          background: rgba(255,138,110,0.10);
          border-radius: 8px;
          font-family: var(--mono2);
          font-size: 12px;
          color: var(--state-warning);
          letter-spacing: 0.12em;
        }

        /* ───────────────────────── LOADING ───────────────────────── */
        .sig-inv__loading {
          margin-top: var(--s-4);
        }
        .sig-inv__loadingGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .sig-inv__loadingCell {
          height: 110px;
          border: 1px solid var(--line);
          background: linear-gradient(
            90deg,
            rgba(200,167,93,0.04) 0%,
            rgba(200,167,93,0.10) 50%,
            rgba(200,167,93,0.04) 100%
          );
          background-size: 200% 100%;
          border-radius: 10px;
          animation: sigShimmer 1.6s ease-in-out infinite;
        }
        @keyframes sigShimmer {
          0% { background-position: 200% 0; opacity: 0.5; }
          50% { opacity: 0.85; }
          100% { background-position: -200% 0; opacity: 0.5; }
        }
        .sig-inv__loadingLabel {
          margin: 14px 0 0;
          text-align: center;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.32em;
          color: var(--ink-dim);
          text-transform: uppercase;
        }

        /* ───────────────────────── RESULT ───────────────────────── */
        .sig-inv__result { margin-top: var(--s-4); }

        .sig-inv__summary {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 14px;
          margin-bottom: var(--s-3);
          border: 1px solid rgba(200,167,93,0.22);
          background: rgba(200,167,93,0.05);
          border-radius: 8px;
          font-family: var(--mono2);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-2);
        }
        .sig-inv__summaryWallet {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--gold);
          font-weight: 700;
        }
        .sig-inv__summaryDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold);
          box-shadow: 0 0 8px var(--gold);
        }
        .sig-inv__summaryStats strong {
          color: var(--ink);
          font-family: var(--display);
          font-size: 16px;
          letter-spacing: 0;
        }
        .sig-inv__sep { color: var(--ink-dim); margin: 0 6px; }

        /* ───────────────────────── EMPTY STATE ───────────────────────── */
        .sig-inv__empty {
          padding: clamp(24px, 5vw, 40px);
          border: 1px dashed var(--line-2);
          background: rgba(0, 0, 0, 0.35);
          border-radius: 12px;
          text-align: center;
        }
        .sig-inv__emptyGlyph {
          font-size: 42px;
          color: var(--ink-dim);
          opacity: 0.55;
          margin-bottom: 12px;
        }
        .sig-inv__emptyTitle {
          margin: 0 0 8px;
          font-family: var(--display);
          font-size: 22px;
          color: var(--ink);
        }
        .sig-inv__emptyBody {
          margin: 0 auto;
          max-width: 420px;
          font-family: var(--mono2);
          font-size: 12px;
          color: var(--ink-dim);
          line-height: 1.7;
        }

        /* ───────────────────────── ARCHIVE CARDS ───────────────────────── */
        .sig-inv__archives {
          display: grid;
          gap: var(--s-3);
        }
        .sig-inv__archive {
          --archive-color: var(--gold);
          position: relative;
          padding: clamp(16px, 3vw, 22px);
          border: 1px solid color-mix(in oklab, var(--archive-color) 35%, transparent);
          border-radius: 12px;
          background:
            linear-gradient(135deg, color-mix(in oklab, var(--archive-color) 8%, transparent), rgba(0, 0, 0, 0.55));
          overflow: hidden;
        }
        /* Left edge color strip — classified-file vibe */
        .sig-inv__archive::before {
          content: "";
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--archive-color);
          opacity: 0.85;
        }

        .sig-inv__archiveHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: var(--s-3);
        }
        .sig-inv__archiveMeta { min-width: 0; }
        .sig-inv__archiveRole {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--archive-color);
          font-weight: 700;
        }
        .sig-inv__archiveGlyph { font-size: 11px; }
        .sig-inv__archiveName {
          font-family: var(--display);
          font-size: clamp(20px, 3vw, 26px);
          line-height: 1.1;
          letter-spacing: -0.005em;
          margin-top: 6px;
          color: var(--ink);
        }
        .sig-inv__archiveStatus {
          margin-top: 6px;
          font-family: var(--mono2);
          font-size: 9px;
          letter-spacing: 0.28em;
          color: var(--ink-dim);
          text-transform: uppercase;
        }

        .sig-inv__archiveCount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding-left: 12px;
          border-left: 1px dashed color-mix(in oklab, var(--archive-color) 25%, transparent);
        }
        .sig-inv__archiveCountNum {
          font-family: var(--display);
          font-size: 36px;
          line-height: 1;
          color: var(--archive-color);
          font-variant-numeric: tabular-nums;
        }
        .sig-inv__archiveCountPlus {
          font-size: 18px;
          color: var(--ink-dim);
          margin-left: 1px;
        }
        .sig-inv__archiveCountLabel {
          margin-top: 4px;
          font-family: var(--mono2);
          font-size: 9px;
          letter-spacing: 0.22em;
          color: var(--ink-dim);
          text-transform: uppercase;
        }

        /* Artefact grid — clean, restrained, square cells */
        .sig-inv__artefacts {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
          gap: 8px;
        }
        .sig-inv__artefact {
          position: relative;
          display: block;
          aspect-ratio: 1;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid color-mix(in oklab, var(--archive-color) 22%, transparent);
          background: rgba(0, 0, 0, 0.45);
          text-decoration: none;
          transition: border-color 140ms ease, transform 140ms ease;
        }
        .sig-inv__artefact:hover {
          border-color: var(--archive-color);
          transform: translateY(-1px);
        }
        .sig-inv__artefactImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sig-inv__artefactPlaceholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-dim);
          font-size: 18px;
          opacity: 0.55;
        }
        .sig-inv__artefactId {
          position: absolute;
          bottom: 3px;
          left: 4px;
          padding: 1px 5px;
          background: rgba(0, 0, 0, 0.7);
          font-family: var(--mono2);
          font-size: 9px;
          letter-spacing: 0.06em;
          color: var(--archive-color);
          border-radius: 2px;
          backdrop-filter: blur(2px);
        }

        .sig-inv__archiveMore {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0 0;
          padding-top: 10px;
          border-top: 1px dashed color-mix(in oklab, var(--archive-color) 22%, transparent);
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.22em;
          color: var(--ink-dim);
          text-transform: uppercase;
        }
        .sig-inv__archiveMoreLink {
          color: var(--archive-color);
          text-decoration: none;
          font-weight: 700;
        }

        /* ───────────────────────── NOT CONNECTED ───────────────────────── */
        .sig-inv__notConnected {
          margin-top: var(--s-4);
          padding-top: var(--s-3);
          border-top: 1px dashed var(--line);
        }
        .sig-inv__notConnectedKicker {
          display: block;
          margin-bottom: 10px;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.32em;
          color: var(--ink-dim);
          text-transform: uppercase;
        }
        .sig-inv__notConnectedList {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .sig-inv__notConnectedChip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 1px solid var(--line);
          border-radius: 999px;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-dim);
          background: rgba(0, 0, 0, 0.35);
        }
        .sig-inv__notConnectedDot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--ink-fade);
        }
        .sig-inv__notConnectedChip[data-status="rate_limited"] .sig-inv__notConnectedDot,
        .sig-inv__notConnectedChip[data-status="error"] .sig-inv__notConnectedDot {
          background: var(--state-warning);
        }
        .sig-inv__notConnectedWarn {
          color: var(--state-warning);
        }

        /* ───────────────────────── MOBILE ───────────────────────── */
        @media (max-width: 540px) {
          .sig-inv__form {
            flex-direction: column;
            /* Critical: align-items stretch + column was causing the
               input wrapper to consume all available vertical space
               (giant ~600px input box on iPhone). Anchor cross-axis
               to start so children honour their own min-height. */
            align-items: stretch;
          }
          /* Lock the input wrapper to its content height — flex column
             was making it grow vertically. */
          .sig-inv__inputWrap {
            flex: 0 0 auto;
            height: 48px;
            max-height: 48px;
          }
          .sig-inv__input {
            font-size: 13px;
            letter-spacing: 0.04em;
            /* Allow long addresses to scroll horizontally inside the
               input instead of clipping silently under the right edge. */
            text-overflow: ellipsis;
          }
          .sig-inv__scanBtn {
            flex: 0 0 auto;
            width: 100%;
            min-width: 0;
          }

          /* Kicker pill was wrapping to 2 lines at 390px width. Tighter
             letter-spacing + smaller font keeps it on one line on every
             modern phone (iPhone SE 375 included). */
          .sig-inv__kicker {
            font-size: 9px;
            letter-spacing: 0.22em;
            padding: 5px 10px;
            gap: 6px;
          }

          .sig-inv__archiveHead { gap: 10px; }
          .sig-inv__archiveCount {
            padding-left: 0;
            border-left: none;
            flex-direction: row;
            align-items: baseline;
            gap: 6px;
          }
          .sig-inv__archiveCountLabel { margin-top: 0; }
          .sig-inv__summary { font-size: 10px; letter-spacing: 0.12em; }
          .sig-inv__summaryStats strong { font-size: 14px; }
          .sig-inv__artefacts {
            grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
          }
        }
      `}</style>
    </section>
  );
}
