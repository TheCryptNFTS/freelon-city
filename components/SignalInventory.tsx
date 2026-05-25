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

  // Signal-detected attribute triggers the SIGNAL_GREEN cursor reticle
  // when scoped inside .archive-page (see globals.css). Only activates
  // when we actually pulled artefacts back — not on idle/loading/empty.
  const signalDetected = status === "ok" && totalArtefacts > 0;
  return (
    <section
      className="sig-inv"
      data-signal={signalDetected ? "detected" : undefined}
    >
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
        /* Archival visual pass 2026-05-25: flat ASH_PANEL, no radial
           glow, no hex blueprint inside the panel (the page already
           has the hex-grid overlay). Sacred ANCIENT_GOLD double-rule
           at the top edge — that's the only ornament. */
        .sig-inv {
          position: relative;
          margin: var(--s-6) 0;
          padding: clamp(20px, 4vw, 36px);
          border: 1px solid var(--archival-line);
          background: var(--archival-surface);
          border-radius: 8px;
          overflow: hidden;
        }
        .sig-inv::before {
          content: "";
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background:
            linear-gradient(180deg, var(--archival-rule-gold) 0 1px,
                                    transparent 1px 2px,
                                    var(--archival-line-deep) 2px 3px);
          pointer-events: none;
        }
        .sig-inv > * { position: relative; }

        /* ───────────────────────── HEADER ───────────────────────── */
        .sig-inv__header { margin-bottom: var(--s-4); }
        /* Kicker: classified-document classification line, no pill
           fill. ANCIENT_GOLD allowed here (sacred: this names the
           archive terminal itself). */
        .sig-inv__kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--archival-gold);
          font-weight: 700;
        }
        .sig-inv__glyph {
          font-size: 11px;
          opacity: 0.9;
        }
        .sig-inv__title {
          font-family: var(--display);
          font-size: clamp(28px, 4.5vw, 46px);
          line-height: 1;
          letter-spacing: -0.015em;
          margin: 12px 0 8px;
          color: var(--archival-bone);
          font-weight: 400;
          text-transform: none;
        }
        .sig-inv__title em {
          color: var(--archival-gold);
          font-style: normal;
        }
        .sig-inv__lede {
          font-family: var(--mono2);
          font-size: 13px;
          color: var(--archival-bone-2);
          line-height: 1.7;
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
        /* Input: flat carbon, bone border, SIGNAL_GREEN on focus only
           (the moment of active scanning is the only place the
           signal-detected color is allowed). No glow, no glass blur. */
        .sig-inv__inputWrap {
          flex: 1 1 320px;
          display: flex;
          align-items: stretch;
          border: 1px solid var(--archival-line);
          background: var(--archival-carbon);
          border-radius: 8px;
          overflow: hidden;
          min-height: 48px;
          transition: border-color 140ms ease;
        }
        .sig-inv__inputWrap:focus-within {
          border-color: var(--archival-signal);
        }
        .sig-inv__inputPrefix {
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          font-family: var(--mono2);
          font-size: 13px;
          color: var(--archival-dust);
          letter-spacing: 0.12em;
          background: transparent;
          border-right: 1px solid var(--archival-line);
        }
        .sig-inv__input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--archival-bone);
          font-family: var(--mono2);
          font-size: 14px;
          letter-spacing: 0.05em;
          padding: 0 14px;
          outline: none;
          min-width: 0;
        }
        .sig-inv__input::placeholder {
          color: var(--archival-dust-2);
        }
        /* Scan button: bone fill on void text. Same primary-button
           pattern used site-wide — restraint is the rule, glow is not. */
        .sig-inv__scanBtn {
          flex: 0 0 auto;
          padding: 0 22px;
          min-height: 48px;
          min-width: 180px;
          background: var(--archival-bone);
          color: var(--archival-bg);
          border: none;
          border-radius: 8px;
          font-family: var(--mono2);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 140ms ease, opacity 140ms ease;
          position: relative;
          overflow: hidden;
        }
        /* Audit 2026-05-25: SIGNAL_GREEN is reserved for the connected
           state only (active scan, "SIGNAL DETECTED", data-signal
           cursor). Hover stays inside the archival palette — bone
           softens, the rest holds. */
        .sig-inv__scanBtn:hover:not(:disabled) {
          background: var(--archival-bone-2);
        }
        .sig-inv__scanBtn:disabled { opacity: 0.4; cursor: default; }
        .sig-inv__scanLabel { position: relative; z-index: 1; }

        /* Error: CORRUPTION_MAGENTA, used only for true failure states. */
        .sig-inv__err {
          margin: 12px 0 0;
          padding: 10px 14px;
          border: 1px solid var(--archival-corruption);
          background: transparent;
          border-radius: 6px;
          font-family: var(--mono2);
          font-size: 12px;
          color: var(--archival-corruption);
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
        /* Loading: subtle bone shimmer, not gold. Quieter than before. */
        .sig-inv__loadingCell {
          height: 110px;
          border: 1px solid var(--archival-line);
          background: linear-gradient(
            90deg,
            rgba(232,224,207,0.02) 0%,
            rgba(232,224,207,0.06) 50%,
            rgba(232,224,207,0.02) 100%
          );
          background-size: 200% 100%;
          border-radius: 6px;
          animation: sigShimmer 1.6s ease-in-out infinite;
        }
        @keyframes sigShimmer {
          0% { background-position: 200% 0; opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { background-position: -200% 0; opacity: 0.4; }
        }
        .sig-inv__loadingLabel {
          margin: 14px 0 0;
          text-align: center;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.32em;
          color: var(--archival-dust);
          text-transform: uppercase;
        }

        /* ───────────────────────── RESULT ───────────────────────── */
        .sig-inv__result { margin-top: var(--s-4); }

        /* Summary strip: flat carbon, bone border. SIGNAL_GREEN dot is
           the ONLY marker that the scan succeeded — the "SIGNAL
           DETECTED" semantic earns the green token. Wallet address
           stays in dust/bone, not gold (we removed the gold-everywhere
           tendency). */
        .sig-inv__summary {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 16px;
          margin-bottom: var(--s-3);
          border: 1px solid var(--archival-line);
          background: var(--archival-carbon);
          border-radius: 6px;
          font-family: var(--mono2);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--archival-bone-2);
        }
        .sig-inv__summaryWallet {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--archival-bone);
          font-weight: 700;
        }
        .sig-inv__summaryDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--archival-signal);
        }
        .sig-inv__summaryStats strong {
          color: var(--archival-bone);
          font-family: var(--display);
          font-size: 16px;
          letter-spacing: 0;
        }
        .sig-inv__sep { color: var(--archival-dust); margin: 0 8px; }

        /* ───────────────────────── EMPTY STATE ───────────────────────── */
        .sig-inv__empty {
          padding: clamp(24px, 5vw, 40px);
          border: 1px dashed var(--archival-line);
          background: transparent;
          border-radius: 8px;
          text-align: center;
        }
        .sig-inv__emptyGlyph {
          font-size: 42px;
          color: var(--archival-dust);
          opacity: 0.5;
          margin-bottom: 12px;
        }
        .sig-inv__emptyTitle {
          margin: 0 0 8px;
          font-family: var(--display);
          font-size: 22px;
          color: var(--archival-bone);
          font-weight: 400;
          text-transform: none;
        }
        .sig-inv__emptyBody {
          margin: 0 auto;
          max-width: 420px;
          font-family: var(--mono2);
          font-size: 12px;
          color: var(--archival-dust);
          line-height: 1.7;
        }

        /* ───────────────────────── ARCHIVE CARDS ───────────────────────── */
        .sig-inv__archives {
          display: grid;
          gap: var(--s-3);
        }
        /* Archive card: flat carbon, bone border, thin left edge in the
           collection's accent color (this is the only place per-archive
           color is allowed — everywhere else uses archival tokens). */
        .sig-inv__archive {
          --archive-color: var(--archival-dust);
          position: relative;
          padding: clamp(16px, 3vw, 22px);
          border: 1px solid var(--archival-line);
          border-radius: 8px;
          background: var(--archival-carbon);
          overflow: hidden;
        }
        .sig-inv__archive::before {
          content: "";
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: var(--archive-color);
          opacity: 0.55;
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
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--archival-dust);
          font-weight: 700;
        }
        .sig-inv__archiveGlyph { font-size: 11px; }
        .sig-inv__archiveName {
          font-family: var(--display);
          font-size: clamp(20px, 3vw, 26px);
          line-height: 1.1;
          letter-spacing: -0.005em;
          margin-top: 6px;
          color: var(--archival-bone);
          font-weight: 400;
          text-transform: none;
        }
        .sig-inv__archiveStatus {
          margin-top: 6px;
          font-family: var(--mono2);
          font-size: 9px;
          letter-spacing: 0.32em;
          color: var(--archival-dust);
          text-transform: uppercase;
        }

        .sig-inv__archiveCount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding-left: 12px;
          border-left: 1px dashed var(--archival-line);
        }
        .sig-inv__archiveCountNum {
          font-family: var(--display);
          font-size: 36px;
          line-height: 1;
          color: var(--archival-bone);
          font-variant-numeric: tabular-nums;
        }
        .sig-inv__archiveCountPlus {
          font-size: 18px;
          color: var(--archival-dust);
          margin-left: 1px;
        }
        .sig-inv__archiveCountLabel {
          margin-top: 4px;
          font-family: var(--mono2);
          font-size: 9px;
          letter-spacing: 0.32em;
          color: var(--archival-dust);
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
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid var(--archival-line);
          background: var(--archival-bg);
          text-decoration: none;
          transition: border-color 140ms ease, transform 140ms ease;
        }
        .sig-inv__artefact:hover {
          border-color: var(--archival-gold);
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
          color: var(--archival-dust);
          font-size: 18px;
          opacity: 0.5;
        }
        /* Artefact id chip: flat dark, no backdrop-blur (glass tell). */
        .sig-inv__artefactId {
          position: absolute;
          bottom: 3px;
          left: 4px;
          padding: 1px 5px;
          background: rgba(5, 5, 5, 0.85);
          font-family: var(--mono2);
          font-size: 9px;
          letter-spacing: 0.06em;
          color: var(--archival-bone-3);
          border-radius: 2px;
        }

        .sig-inv__archiveMore {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0 0;
          padding-top: 10px;
          border-top: 1px dashed var(--archival-line);
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.32em;
          color: var(--archival-dust);
          text-transform: uppercase;
        }
        .sig-inv__archiveMoreLink {
          color: var(--archival-bone-2);
          text-decoration: none;
          font-weight: 700;
        }
        .sig-inv__archiveMoreLink:hover { color: var(--archival-gold); }

        /* ───────────────────────── NOT CONNECTED ───────────────────────── */
        .sig-inv__notConnected {
          margin-top: var(--s-4);
          padding-top: var(--s-3);
          border-top: 1px dashed var(--archival-line);
        }
        .sig-inv__notConnectedKicker {
          display: block;
          margin-bottom: 10px;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.32em;
          color: var(--archival-dust);
          text-transform: uppercase;
        }
        .sig-inv__notConnectedList {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        /* Chips: monochrome bone/dust with a colored dot prefix only. */
        .sig-inv__notConnectedChip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 1px solid var(--archival-line);
          border-radius: 999px;
          font-family: var(--mono2);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--archival-dust);
          background: transparent;
        }
        .sig-inv__notConnectedDot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--archival-dust-2);
        }
        .sig-inv__notConnectedChip[data-status="rate_limited"] .sig-inv__notConnectedDot,
        .sig-inv__notConnectedChip[data-status="error"] .sig-inv__notConnectedDot {
          background: var(--archival-corruption);
        }
        .sig-inv__notConnectedWarn {
          color: var(--archival-corruption);
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
