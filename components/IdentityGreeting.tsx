"use client";
/**
 * <IdentityGreeting /> — wallet-aware greeting pill.
 *
 * Sits ABOVE the homepage hero. For known viewers it transforms the
 * page into a personal experience: civ color, handle, citizen count,
 * hex balance, current defender status. For new visitors it nudges
 * toward /sync.
 *
 * This is the cheapest "alive" win on the site — zero ongoing
 * burden, dramatic emotional shift for holders. The brand statement
 * stays below it intact, so newcomers see the canon line unchanged.
 *
 * Loading state renders a thin skeleton at the same height so the
 * hero doesn't jump when data arrives.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerAddr } from "@/lib/use-viewer";
import { CIVILIZATIONS } from "@/lib/constants";

type WalletData = {
  citizenCount: number;
  dominantCivSlug: string | null;
  hexBalance: number | null;
  xHandle: string | null;
};

const CIVS = CIVILIZATIONS as Record<string, { name: string; color: string }>;

export function IdentityGreeting() {
  const viewer = useViewerAddr();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer.ready) return;
    if (!viewer.addr) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/wallet/${viewer.addr}/tokens`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/wallet/${viewer.addr}/civs`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/wallet/${viewer.addr}/hex`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/x/me`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([tokens, civs, hex, x]) => {
      if (cancelled) return;
      const citizenCount =
        (tokens && Array.isArray(tokens.tokenIds) && tokens.tokenIds.length) ||
        (tokens && typeof tokens.balance === "number" && tokens.balance) || 0;
      // Pick dominant civ from civs breakdown (largest count)
      let dominantCivSlug: string | null = null;
      if (civs && Array.isArray(civs.breakdown)) {
        const top = [...civs.breakdown].sort(
          (a: { count: number }, b: { count: number }) => b.count - a.count,
        )[0] as { slug?: string } | undefined;
        if (top?.slug) dominantCivSlug = top.slug;
      }
      const hexBalance = typeof hex?.balance === "number" ? hex.balance : null;
      const xHandle = x?.verification?.xHandle || null;
      setData({ citizenCount, dominantCivSlug, hexBalance, xHandle });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [viewer.addr, viewer.ready]);

  // ── States ─────────────────────────────────────────────────────
  if (!viewer.ready || loading) return <Skeleton />;

  // Not connected — gentle nudge
  if (!viewer.addr) {
    return (
      <div className="identity-greeting identity-greeting--anon">
        <span className="ig-glyph" aria-hidden>⬡</span>
        <span className="ig-line">
          No signal detected · <Link href="/sync" className="ig-cta">SYNC TO ENTER THE CITY →</Link>
        </span>
        <PillStyle />
      </div>
    );
  }

  // Connected
  const civ = data?.dominantCivSlug ? CIVS[data.dominantCivSlug] : null;
  const civColor = civ?.color || "var(--gold)";
  const shortAddr = `${viewer.addr.slice(0, 6)}…${viewer.addr.slice(-4)}`;
  const isCarrier = (data?.citizenCount ?? 0) > 0;

  return (
    <div
      className="identity-greeting identity-greeting--known"
      style={{ "--ig-civ": civColor } as React.CSSProperties}
    >
      <span className="ig-glyph" aria-hidden style={{ color: civColor }}>⬡</span>
      <span className="ig-line">
        <strong>Signal detected</strong>
        {" · "}
        {data?.xHandle ? (
          <a href={`https://x.com/${data.xHandle}`} target="_blank" rel="noreferrer" className="ig-handle">
            @{data.xHandle}
          </a>
        ) : (
          <Link href={`/wallet/${viewer.addr}`} className="ig-handle">{shortAddr}</Link>
        )}
        {civ && (
          <>
            {" · "}
            <Link href={`/civilizations/${data!.dominantCivSlug!}`} className="ig-civ" style={{ color: civColor }}>
              {civ.name.toUpperCase()}
            </Link>
          </>
        )}
        {isCarrier ? (
          <>
            {" · "}
            <span className="ig-stat">
              {data!.citizenCount} citizen{data!.citizenCount === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <>
            {" · "}
            <a href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer" className="ig-cta">
              CLAIM YOUR FIRST CITIZEN →
            </a>
          </>
        )}
        {data?.hexBalance != null && data.hexBalance > 0 && (
          <>
            {" · "}
            <span className="ig-stat">{data.hexBalance.toLocaleString()} ⬡</span>
          </>
        )}
      </span>
      <PillStyle />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="identity-greeting identity-greeting--loading" aria-hidden>
      <span className="ig-glyph">⬡</span>
      <span className="ig-line" style={{ opacity: 0.35 }}>scanning the signal…</span>
      <PillStyle />
    </div>
  );
}

function PillStyle() {
  return (
    <style>{`
      .identity-greeting {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-radius: 999px;
        margin-bottom: 14px;
        font-family: var(--mono2);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        max-width: 100%;
        flex-wrap: wrap;
      }
      .identity-greeting--anon {
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.03);
        color: var(--ink-2);
      }
      .identity-greeting--loading {
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.02);
        color: var(--ink-dim);
      }
      .identity-greeting--known {
        border: 1px solid var(--ig-civ);
        background: color-mix(in oklab, var(--ig-civ) 8%, transparent);
        color: var(--ink);
        box-shadow: 0 0 24px -4px color-mix(in oklab, var(--ig-civ) 25%, transparent);
      }
      .identity-greeting .ig-glyph {
        font-size: 14px;
        line-height: 1;
      }
      .identity-greeting .ig-line {
        line-height: 1.5;
      }
      .identity-greeting .ig-handle,
      .identity-greeting .ig-civ {
        text-decoration: none;
        font-weight: 600;
      }
      .identity-greeting .ig-handle:hover,
      .identity-greeting .ig-civ:hover {
        text-decoration: underline;
      }
      .identity-greeting .ig-cta {
        color: var(--gold);
        text-decoration: none;
        font-weight: 700;
      }
      .identity-greeting .ig-cta:hover {
        text-decoration: underline;
      }
      .identity-greeting .ig-stat {
        color: var(--ink-2);
        font-variant-numeric: tabular-nums;
      }
      @media (max-width: 540px) {
        .identity-greeting { font-size: 10px; gap: 8px; padding: 6px 10px; letter-spacing: 0.08em; }
      }
    `}</style>
  );
}
