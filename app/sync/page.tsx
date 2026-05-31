import type { Metadata } from "next";
import Link from "next/link";
import { InlineSync } from "@/components/InlineSync";
import { WalletScanner } from "./WalletScanner";
import { SyncWalletAction } from "./SyncWalletAction";
import { SignalUniverse } from "@/components/SignalUniverse";
import { VaultClient } from "@/components/VaultClient";
import { CarrierClient } from "../carrier/CarrierClient";

export const dynamic = "force-dynamic";

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
//
// 2026-05-31 — consolidation: /signal, /passport, /vault and /carrier are
// folded into this single tabbed hub so a holder has ONE destination for
// everything tied to their wallet/identity. Each former page is now a
// stacked <section> with a stable id; central redirects point the old
// routes at the matching anchor.
const PAGE_DESC =
  "Sync your wallet to enter FREELON CITY — your signal across the six collections, your passport, your vault, and your carrier rank, in one place.";
export const metadata: Metadata = {
  title: "Enter the City",
  description: PAGE_DESC,
  openGraph: {
    title: "Enter the City",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enter the City",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

// Sticky in-page sub-nav — pure anchor links, SSR-friendly, no client
// state. Each href targets a section id below.
const SUBNAV: Array<{ id: string; label: string }> = [
  { id: "connect", label: "CONNECT" },
  { id: "signal", label: "SIGNAL" },
  { id: "passport", label: "PASSPORT" },
  { id: "vault", label: "VAULT" },
  { id: "carrier", label: "CARRIER" },
];

// The ?r=<handle> referral capture now lives in middleware.ts — it sets the
// freelon_ref cookie on the /sync response (cookie mutation isn't allowed in a
// Server Component render under Next 15, which is why the old in-render set was
// a silent no-op). This page is purely presentational.
export default function SyncPage() {
  return (
    <div className="sync-hub">
      {/* Sticky sub-nav — one hub, five anchored destinations. */}
      <nav className="sync-subnav" aria-label="Sync sections">
        <div className="sync-subnav__inner">
          {SUBNAV.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="sync-subnav__link">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ── CONNECT — the original /sync (wallet connect + civ finder) ── */}
      <section
        id="connect"
        className="sync-empty"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(10,12,18,0.5) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/atmos/sync.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="sync-hero">
          <span className="kicker">⬡ ENTER THE CITY</span>
          <h1>The city <em>remembers</em> you</h1>
          <p>
            {/* 2026-05-27 (post-Ogilvy down-funnel): cut the overengineered
               second clause that described every input method in one
               sentence. The h1 is the moment; the lede should set up the
               button, not catalog the form. Paste-fallback copy lives in
               the secondary section below. */}
            Connect to read the signal already in your wallet — your civilization,
            your alignment, what you carry.
          </p>
          {/* 2026-05-31 — added a plain "which path is for me" line. The page
              shows two ways in (connect a wallet / enter a handle) with no
              guidance on which to pick; the poetic lede above never says it. */}
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginTop: "var(--s-2)" }}>
            Own a Freelon? Connect your wallet to see what you hold. Just exploring?
            Enter your X handle below — no wallet needed.
          </p>
        </div>

        {/* Primary path: connect wallet (eth_requestAccounts). */}
        <SyncWalletAction />

        {/* Fallback path: scan a pasted address/ENS/handle. */}
        <WalletScanner />

        <div
          className="sync-fallback"
          style={{
            maxWidth: 720,
            margin: "var(--s-7) auto 0",
            padding: "var(--s-5) var(--pad) var(--s-6)",
            borderTop: "1px solid var(--line)",
            textAlign: "center",
          }}
        >
          <span
            className="kicker"
            style={{ display: "block", marginBottom: "var(--s-3)" }}
          >
            ⬡ OR SYNC BY HANDLE
          </span>
          <p
            style={{
              color: "var(--ink-2)",
              margin: "0 0 var(--s-3)",
              fontSize: 14,
            }}
          >
            Not a citizen yet. Drop your handle — the city assigns your civ deterministically.
          </p>
          <div className="big-input">
            <InlineSync />
          </div>
        </div>

        {/* NEXT — 2026-05-28 funnel fix: /sync previously dead-ended after
           the connect/handle widgets. Post-sync home is the dashboard;
           the city wall is the other natural next step. Both linked here
           so a synced visitor always has a clear forward path. */}
        <div
          className="sync-next"
          style={{
            maxWidth: 720,
            margin: "var(--s-6) auto 0",
            padding: "0 var(--pad)",
            textAlign: "center",
          }}
        >
          <span
            className="kicker"
            style={{ display: "block", marginBottom: "var(--s-3)" }}
          >
            ⬡ NEXT
          </span>
          <div
            style={{
              display: "inline-flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link className="btn btn-primary" href="/dashboard">
              <span className="ttl">VIEW YOUR DASHBOARD →</span>
            </Link>
            <Link className="btn btn-secondary" href="/transmissions">
              <span className="ttl">THE CITY WALL →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SIGNAL — cross-collection wallet inventory (was /signal) ── */}
      <section id="signal" className="sync-section signal-page">
        <SignalUniverse />
      </section>

      {/* ── PASSPORT — identity landing (was /passport) ── */}
      <section id="passport" className="sync-section sync-passport">
        <span className="kicker">⬡ PASSPORT</span>
        <h2 className="sync-passport__h">
          Every wallet <em>carries a passport.</em>
        </h2>
        <p className="sync-passport__body">
          The city issues no passport on its own. It reads the one your wallet
          already carries — the citizens, signals, and artefacts recorded in
          your address. Connect above to reveal yours; the passport resolves
          for the address you sync.
        </p>
      </section>

      {/* ── VAULT — safe batch transfer (was /vault) ── */}
      <section id="vault" className="sync-section">
        <VaultClient />
      </section>

      {/* ── CARRIER — carrier rank system (was /carrier) ── */}
      <section
        id="carrier"
        className="sync-section carrier-page"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(10,12,18,0.55) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/atmos/carrier.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="carrier-hero">
          <span className="kicker">⬡ CARRIER PROTOCOL · HOLD THE SIGNAL</span>
          <h2>
            Holders own citizens<br />
            <em>Carriers hold the signal</em>
          </h2>
          <p className="lead">
            We&apos;re building the city together. Sign in with X, relay today&apos;s
            signal, claim your hex. Every post resets the 14-day decay timer and keeps
            your passive baseline alive. Skip too many days and the meter pauses until
            you carry again.
          </p>
        </div>
        <CarrierClient />
        <div className="carrier-next" style={{ maxWidth: 1200, margin: "var(--s-6) auto 0", padding: "0 var(--s-4)", textAlign: "center" }}>
          <span className="kicker">⬡ NEXT SIGNAL</span>
          <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
            Carrying isn&rsquo;t the only path. Burn ⬡ for a permanent name on a citizen.
          </p>
          <a className="btn btn-primary" href="/patrons">
            <span className="ttl">BURN HEX FOR YOUR NAME →</span>
          </a>
        </div>
      </section>

      <style>{`
        .sync-hub { display: block; }
        /* Sticky sub-nav — anchor links to each folded section. */
        .sync-subnav {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(8,10,14,0.86);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        .sync-subnav__inner {
          max-width: var(--maxw);
          margin: 0 auto;
          padding: var(--s-2) var(--pad);
          display: flex;
          gap: var(--s-1);
          flex-wrap: wrap;
          justify-content: center;
        }
        .sync-subnav__link {
          font-family: var(--mono2);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-dim);
          text-decoration: none;
          padding: 8px 14px;
          border: 1px solid transparent;
          border-radius: 999px;
          transition: color .15s ease, border-color .15s ease;
        }
        .sync-subnav__link:hover {
          color: var(--gold);
          border-color: var(--gold-deep);
        }
        /* Each folded section gets breathing room + a scroll anchor offset so
           the sticky sub-nav never covers a section heading. */
        .sync-section {
          scroll-margin-top: 64px;
          padding: var(--s-8) var(--pad);
          border-top: 1px solid var(--line);
        }
        #connect { scroll-margin-top: 64px; }
        .sync-passport {
          max-width: 720px;
          margin: 0 auto;
          text-align: center;
        }
        .sync-passport__h {
          font-family: var(--display);
          font-size: clamp(32px, 5vw, 52px);
          line-height: 0.98;
          letter-spacing: -0.02em;
          margin: var(--s-3) 0 var(--s-4);
        }
        .sync-passport__h em { color: var(--gold); font-style: normal; }
        .sync-passport__body {
          font-family: var(--mono2);
          font-size: 14px;
          color: var(--ink-2);
          line-height: 1.75;
          max-width: 560px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
