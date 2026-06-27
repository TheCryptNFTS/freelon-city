"use client";
/**
 * <IdentityGreeting /> — wallet-aware greeting pill.
 *
 * Renders above the homepage hero. Three states:
 *   - loading: skeleton pill
 *   - anon:    "Try a citizen free · no wallet needed →" (→ /demo)
 *   - known:   civ-colored ring + handle + civ + counts + hex
 *
 * The pill chrome itself is the shared <Pill /> primitive — civ
 * variant for known viewers, default for anon/loading. Local styles
 * only carry the inline anchor formatting + skeleton shimmer.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerAddr } from "@/lib/use-viewer";
import { readBuyIntent, clearBuyIntent, trackEvent } from "@/lib/track";
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
  // Buy→awaken return loop (upgrade audit #4): if they clicked an OpenSea CTA
  // and came back, nudge them to /my-citizens (or /sync) to AWAKEN it.
  const [buyIntent, setBuyIntent] = useState(false);
  useEffect(() => {
    const returning = readBuyIntent() != null;
    setBuyIntent(returning);
    // The buy-intent breadcrumb was instrumented going OUT (opensea_click) but
    // never coming back, so we couldn't measure how many post-buy visitors we
    // recover into the AWAKEN path. Fire once when a pending intent is seen.
    if (returning) trackEvent("buy_intent_return", { surface: "home_greeting" });
  }, []);
  const dismissBuyIntent = () => { clearBuyIntent(); setBuyIntent(false); };
  const returnBanner = buyIntent ? (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
        margin: "0 0 8px", padding: "7px 12px", fontSize: 12.5,
        fontFamily: "var(--mono2, monospace)", border: "1px solid var(--gold-deep)",
        borderRadius: 999, background: "rgba(200,167,93,0.07)", color: "var(--ink-dim)",
      }}
    >
      <span aria-hidden style={{ color: "var(--gold)" }}>⬡</span>
      <span>
        Bought a FREELON?{" "}
        <Link
          href={viewer.addr ? "/my-citizens" : "/sync"}
          onClick={dismissBuyIntent}
          style={{ color: "var(--gold-bright)", fontWeight: 600, textDecoration: "none" }}
        >
          {viewer.addr ? "Awaken it →" : "Connect to awaken it →"}
        </Link>
      </span>
      <button
        type="button" aria-label="Dismiss" onClick={dismissBuyIntent}
        style={{ background: "none", border: "none", color: "var(--ink-fade)", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}
      >
        ×
      </button>
    </div>
  ) : null;

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
        {returnBanner}
        <Pill>
          <span className="ig-glyph" aria-hidden>⬡</span>
          <Link href="/demo" className="ig-cta">Try a citizen free</Link>
          <span> · no wallet needed →</span>
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
      {returnBanner}
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
