"use client";
/**
 * <DoThisNow /> — homepage funnel widget.
 *
 * Born from a Discord report on 2026-05-23 where @Bangster and @Eldox
 * both said they had no idea how people were earning hex. The
 * mechanics existed (claim, sweep, share, transmit, snipe, burn) but
 * the path to the first earning event was invisible.
 *
 * This widget shows ONE primary action at a time, ranked by impact
 * for the current viewer:
 *   - Not synced     → "PICK YOUR CIV" (sync)
 *   - Synced, no claim today → "CLAIM TODAY'S 10⬡"
 *   - Claimed today  → "SWEEP A 🔴 RED SIGNAL"
 *
 * Two backup actions surface below the primary so the page has depth
 * without forcing the user to read /earn end-to-end.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerAddr } from "@/lib/use-viewer";

type ClaimStatus = { last: string | null; canClaim: boolean; today: string } | null;

export function DoThisNow() {
  const viewer = useViewerAddr();
  const [claim, setClaim] = useState<ClaimStatus>(null);
  const [hex, setHex] = useState<number | null>(null);

  useEffect(() => {
    if (!viewer.addr) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/claim?addr=${viewer.addr}`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
      fetch(`/api/wallet/${viewer.addr}/hex`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
    ]).then(([c, h]) => {
      if (cancelled) return;
      setClaim(c);
      if (h && typeof h.balance === "number") setHex(h.balance);
    });
    return () => { cancelled = true; };
  }, [viewer.addr]);

  // Decide the primary action
  const notSynced = !viewer.addr;
  const canClaim = claim?.canClaim === true;

  return (
    <section
      aria-label="Do this now"
      style={{
        maxWidth: "var(--maxw)",
        margin: "var(--s-5) auto",
        padding: "var(--s-4) var(--pad)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: "var(--s-3)",
          alignItems: "stretch",
        }}
        className="dtn-grid"
      >
        {/* PRIMARY */}
        <article
          style={{
            padding: "var(--s-4) var(--s-5)",
            border: "1px solid var(--gold)",
            background: "linear-gradient(135deg, rgba(200,167,93,0.10), rgba(200,167,93,0.02))",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold)", textTransform: "uppercase" }}>
            ⬡ DO THIS NOW
          </span>

          {notSynced && (
            <>
              <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
                Claim your daily <em style={{ color: "var(--gold)", fontStyle: "normal" }}>10 ⬡</em> — free, every day.
              </h2>
              <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
                Sync your X handle with FREELON CITY to start the daily-claim streak.
                10 ⬡ today, +25 at 3 days, +100 at 7, +500 at 30. Holding a citizen compounds it.
                No wallet needed to start.
              </p>
              <Link href="/sync" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: 8 }}>
                <span className="ttl">SYNC + CLAIM →</span>
              </Link>
            </>
          )}

          {!notSynced && canClaim && (
            <>
              <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
                Today&apos;s <em style={{ color: "var(--gold)", fontStyle: "normal" }}>10 ⬡</em> is waiting.
              </h2>
              <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
                {hex != null ? `You have ${hex.toLocaleString()} ⬡. ` : ""}
                One click — keep the streak alive. 7-day streak adds +100 ⬡. 30-day adds +500 ⬡.
                The meter resets if you miss a day.
              </p>
              <Link href="/carrier" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: 8 }}>
                <span className="ttl">CLAIM TODAY&apos;S 10 ⬡ →</span>
              </Link>
            </>
          )}

          {!notSynced && !canClaim && claim && (
            <>
              <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
                Daily done. <em style={{ color: "var(--gold)", fontStyle: "normal" }}>Snipe a red signal</em> next.
              </h2>
              <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
                {hex != null ? `You have ${hex.toLocaleString()} ⬡. ` : ""}
                Listings priced ≤ 90% of floor get flagged. Buy one, hold 14 days,
                the city pays the spread in hex — up to +500 ⬡ per snipe.
              </p>
              <Link href="/market" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: 8 }}>
                <span className="ttl">SEE RED SIGNALS →</span>
              </Link>
            </>
          )}

          {/* Loading state — keep the box, soft empty copy */}
          {!notSynced && claim === null && (
            <>
              <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
                Checking the meter…
              </h2>
              <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
                Reading your daily claim status.
              </p>
            </>
          )}
        </article>

        {/* SECONDARY · two backup actions */}
        <div style={{ display: "grid", gap: "var(--s-3)" }}>
          <BackupAction
            num="02"
            title="Sweep a citizen on OpenSea"
            sub="+25 ⬡ per buy · +100 ⬡ for 3 sweeps in 24h"
            href="https://opensea.io/collection/freelons"
            external
          />
          <BackupAction
            num="03"
            title="Post the daily signal on X"
            sub="+10 ⬡ daily · 30-day streak = +500 ⬡"
            href="/relay"
          />
        </div>
      </div>

      <p style={{ marginTop: 12, fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
        ⬡ The full ledger of every earning rule lives at{" "}
        <Link href="/earn" style={{ color: "var(--gold)" }}>/earn</Link>.
      </p>

      <style>{`
        @media (max-width: 820px) {
          .dtn-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function BackupAction({ num, title, sub, href, external }: { num: string; title: string; sub: string; href: string; external?: boolean }) {
  const Comp = external ? (props: { children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>{props.children}</a>
  ) : (props: { children: React.ReactNode }) => (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>{props.children}</Link>
  );
  return (
    <Comp>
      <article
        style={{
          padding: "var(--s-3) var(--s-4)",
          border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 12,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          transition: "background 120ms ease, border-color 120ms ease",
        }}
        className="dtn-backup"
      >
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.26em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          ⬡ {num} · BACKUP
        </span>
        <div style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)", lineHeight: 1.2, letterSpacing: "-0.005em" }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.5 }}>
          {sub}
        </div>
        <div style={{ marginTop: "auto", fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold)", textTransform: "uppercase" }}>
          GO →
        </div>
      </article>
    </Comp>
  );
}
