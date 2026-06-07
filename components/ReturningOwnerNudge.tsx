"use client";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";

/**
 * RETURNING-OWNER NUDGE — closes the buy→unlock gap. "OWN A FREELON" sends a
 * buyer to OpenSea in a new tab and the funnel ends there; nothing routes them
 * back to the paid unlock once they hold one. This catches them the moment they
 * return and connect: a connected wallet that HOLDS a FREELON sees a one-line
 * "you hold N — unlock one to wake its agent →" prompt straight to their owned
 * citizens. Renders nothing for non-holders, so a newcomer never sees it.
 */
export function ReturningOwnerNudge() {
  const h = useHolder();
  if (h.loading || !h.isHolder || !h.address || !(h.balance && h.balance > 0)) return null;

  const n = h.balance;
  return (
    <div className="returning-owner-nudge">
      <span className="ron-dot" aria-hidden />
      <span className="ron-text">
        You hold {n} FREELON{n === 1 ? "" : "S"} — unlock one to wake its agent.
      </span>
      <Link className="ron-cta" href={`/wallet/${h.address.toLowerCase()}#citizens`}>
        YOUR FREELONS →
      </Link>
      <style>{`
        .returning-owner-nudge {
          display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 9px 16px; border: 1px solid var(--gold-deep); border-radius: var(--r-pill);
          background: var(--tint-gold);
          font-family: var(--mono2); font-size: 12px; letter-spacing: 0.03em;
        }
        .ron-dot {
          width: 7px; height: 7px; border-radius: 999px; background: var(--gold-bright);
          box-shadow: 0 0 8px rgba(200,170,100,0.7);
        }
        .ron-text { color: var(--ink); }
        .ron-cta { color: var(--gold-bright); font-weight: 600; white-space: nowrap; }
        .ron-cta:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
