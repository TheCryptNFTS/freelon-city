"use client";
/**
 * <IdentityGreeting /> — wallet-aware greeting pill.
 *
 * Renders above the homepage hero. Three states:
 *   - loading: skeleton pill
 *   - anon:    "no signal · SYNC TO ENTER THE CITY →"
 *   - known:   civ-colored ring + handle + civ + counts + hex
 *
 * The pill chrome itself is the shared <Pill /> primitive — civ
 * variant for known viewers, default for anon/loading. Local styles
 * only carry the inline anchor formatting + skeleton shimmer.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerAddr } from "@/lib/use-viewer";
import { CIVILIZATIONS } from "@/lib/constants";
import { Pill } from "@/components/ui";

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
  if (!viewer.ready || loading) {
    return (
      <div className="ig-wrap">
        <Pill ariaLabel="scanning">
          <span className="ig-glyph" aria-hidden>⬡</span>
          <span style={{ opacity: 0.55 }}>scanning the signal…</span>
        </Pill>
        <IgStyles />
      </div>
    );
  }

  // Not connected — gentle nudge
  if (!viewer.addr) {
    return (
      <div className="ig-wrap">
        <Pill>
          <span className="ig-glyph" aria-hidden>⬡</span>
          <span>No signal detected · </span>
          <Link href="/sync" className="ig-cta">SYNC TO ENTER THE CITY →</Link>
        </Pill>
        <IgStyles />
      </div>
    );
  }

  // Connected
  const civ = data?.dominantCivSlug ? CIVS[data.dominantCivSlug] : null;
  const civColor = civ?.color || "var(--gold)";
  const shortAddr = `${viewer.addr.slice(0, 6)}…${viewer.addr.slice(-4)}`;
  const isCarrier = (data?.citizenCount ?? 0) > 0;

  return (
    <div className="ig-wrap">
      <Pill variant="civ" civColor={civColor}>
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
              <Link
                href={`/civilizations/${data!.dominantCivSlug!}`}
                className="ig-civ"
                style={{ color: civColor }}
              >
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
              <a
                href="https://opensea.io/collection/freelons"
                target="_blank"
                rel="noreferrer"
                className="ig-cta"
              >
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
      </Pill>
      <IgStyles />
    </div>
  );
}

function IgStyles() {
  return (
    <style>{`
      .ig-wrap { margin-bottom: 14px; max-width: 100%; }
      .ig-glyph { font-size: 14px; line-height: 1; }
      .ig-line { line-height: 1.5; }
      .ig-handle, .ig-civ {
        text-decoration: none;
        font-weight: 600;
      }
      .ig-handle:hover, .ig-civ:hover { text-decoration: underline; }
      .ig-cta {
        color: var(--gold);
        text-decoration: none;
        font-weight: 700;
      }
      .ig-cta:hover { text-decoration: underline; }
      .ig-stat {
        color: var(--ink-2);
        font-variant-numeric: tabular-nums;
      }
    `}</style>
  );
}
