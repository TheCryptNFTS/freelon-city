import type { Metadata } from "next";
import Link from "next/link";
import { InlineSync } from "@/components/InlineSync";
import { WalletScanner } from "./WalletScanner";
import { SyncWalletAction } from "./SyncWalletAction";

export const dynamic = "force-dynamic";

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "Sync your wallet to enter FREELON CITY and reveal the signal record connected to what you carry.";
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

// The ?r=<handle> referral capture now lives in middleware.ts — it sets the
// freelon_ref cookie on the /sync response (cookie mutation isn't allowed in a
// Server Component render under Next 15, which is why the old in-render set was
// a silent no-op). This page is purely presentational.
export default function SyncPage() {

  return (
    <div
      className="sync-empty"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(10,12,18,0.5) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/atmos/sync.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <section className="sync-hero">
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
      </section>

      {/* Primary path: connect wallet (eth_requestAccounts). */}
      <SyncWalletAction />

      {/* Fallback path: scan a pasted address/ENS/handle. */}
      <WalletScanner />

      <section
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
      </section>

      {/* NEXT — 2026-05-28 funnel fix: /sync previously dead-ended after
         the connect/handle widgets. Post-sync home is the dashboard;
         the city wall is the other natural next step. Both linked here
         so a synced visitor always has a clear forward path. */}
      <section
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
      </section>
    </div>
  );
}
