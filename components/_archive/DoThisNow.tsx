"use client";
/**
 * <DoThisNow /> — homepage funnel widget.
 *
 * Shows ONE primary action ranked by impact for the current viewer:
 *   - Not synced               → "SYNC + CLAIM" (sync)
 *   - Synced, no claim today   → "CLAIM TODAY'S 10⬡"
 *   - Claimed today            → "SNIPE A RED SIGNAL"
 *
 * Two backup actions surface below the primary. Rendered via the
 * shared <ActionCard /> primitive — no inline styling, no one-off
 * paddings, no hardcoded gold tint.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerAddr } from "@/lib/use-viewer";
import { ActionCard, MobileStack } from "@/components/ui";

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

  const notSynced = !viewer.addr;
  const canClaim = claim?.canClaim === true;

  return (
    <section
      aria-label="Do this now"
      style={{ maxWidth: "var(--maxw)", margin: "var(--s-5) auto", padding: "var(--s-4) var(--pad)" }}
    >
      <div className="dtn-grid">
        {/* PRIMARY */}
        <ActionCard
          variant="hero"
          kicker="⬡ DO THIS NOW"
        >
          {notSynced && <PrimarySync />}
          {!notSynced && canClaim && <PrimaryClaim hex={hex} />}
          {!notSynced && !canClaim && claim && <PrimarySnipe hex={hex} />}
          {!notSynced && claim === null && <PrimaryLoading />}
        </ActionCard>

        {/* Audit 2026-05-25: "Sweep a citizen on OpenSea · +25 ⬡ per buy
           · +100 ⬡ for 3 sweeps in 24h" backup removed — wash-volume
           language on the homepage broadcasts price-manipulation
           intent. Remaining backup is the daily post action. */}
        <MobileStack>
          <ActionCard
            kicker="⬡ 02 · BACKUP"
            title="Post the daily signal on X"
            sub="+10 ⬡ daily · 30-day streak = +500 ⬡"
            more="GO →"
            href="/relay"
          />
        </MobileStack>
      </div>

      <p className="dtn-footer">
        ⬡ The full ledger of every earning rule lives at{" "}
        <Link href="/earn" className="dtn-footer-link">/earn</Link>.
      </p>

      <style>{`
        .dtn-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: var(--s-3);
          align-items: stretch;
        }
        @media (max-width: 820px) {
          .dtn-grid { grid-template-columns: 1fr; }
        }
        .dtn-footer {
          margin-top: 12px;
          font-family: var(--mono2);
          font-size: var(--t-mono-sm);
          color: var(--ink-dim);
          letter-spacing: var(--tr-loose);
          text-transform: uppercase;
        }
        .dtn-footer-link { color: var(--gold); }
      `}</style>
    </section>
  );
}

function PrimarySync() {
  return (
    <>
      <h2 className="ui-action-card__title ui-action-card__title--hero">
        Claim your daily <em className="dtn-em">10 ⬡</em> — free, every day.
      </h2>
      <p className="ui-action-card__sub ui-action-card__sub--hero">
        Sync your X handle with FREELON CITY to start the daily-claim streak.
        10 ⬡ today, +25 at 3 days, +100 at 7, +500 at 30. Holding a citizen compounds it.
        No wallet needed to start.
      </p>
      <Link href="/sync" className="btn btn-primary dtn-cta">
        <span className="ttl">SYNC + CLAIM →</span>
      </Link>
      <DtnLocalStyles />
    </>
  );
}

function PrimaryClaim({ hex }: { hex: number | null }) {
  return (
    <>
      <h2 className="ui-action-card__title ui-action-card__title--hero">
        Today&apos;s <em className="dtn-em">10 ⬡</em> is waiting.
      </h2>
      <p className="ui-action-card__sub ui-action-card__sub--hero">
        {hex != null ? `You have ${hex.toLocaleString()} ⬡. ` : ""}
        One click — keep the streak alive. 7-day streak adds +100 ⬡. 30-day adds +500 ⬡.
        The meter resets if you miss a day.
      </p>
      <Link href="/carrier" className="btn btn-primary dtn-cta">
        <span className="ttl">CLAIM TODAY&apos;S 10 ⬡ →</span>
      </Link>
      <DtnLocalStyles />
    </>
  );
}

function PrimarySnipe({ hex }: { hex: number | null }) {
  return (
    <>
      <h2 className="ui-action-card__title ui-action-card__title--hero">
        Daily done. <em className="dtn-em">Snipe a red signal</em> next.
      </h2>
      <p className="ui-action-card__sub ui-action-card__sub--hero">
        {hex != null ? `You have ${hex.toLocaleString()} ⬡. ` : ""}
        Listings priced ≤ 90% of floor get flagged. Buy one, hold 14 days,
        the city pays the spread in hex — up to +500 ⬡ per snipe.
      </p>
      {/* Was /market — route never existed → 404. Pointed to
          /undervalued (the actual red-signals page) 2026-05-25. */}
      <Link href="/undervalued" className="btn btn-primary dtn-cta">
        <span className="ttl">SEE RED SIGNALS →</span>
      </Link>
      <DtnLocalStyles />
    </>
  );
}

function PrimaryLoading() {
  return (
    <>
      <h2 className="ui-action-card__title ui-action-card__title--hero">
        Checking the meter…
      </h2>
      <p className="ui-action-card__sub ui-action-card__sub--hero">
        Reading your daily claim status.
      </p>
    </>
  );
}

/**
 * Two tiny locally-scoped tweaks — em color + CTA alignment. These
 * are not generic enough to belong in primitives.
 */
function DtnLocalStyles() {
  return (
    <style>{`
      .dtn-em { color: var(--gold); font-style: normal; }
      .dtn-cta { align-self: flex-start; margin-top: 8px; }
    `}</style>
  );
}
