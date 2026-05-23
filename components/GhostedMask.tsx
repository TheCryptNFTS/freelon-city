"use client";
/**
 * <GhostedMask tokenId={n}>{children}</GhostedMask>
 *
 * Wrap any citizen-rendering chunk (image, card, hero). If the city has
 * ghosted the token (listed ≤ DUMP_THRESHOLD × floor past the grace
 * period), the children are visually replaced with the SIGNAL LOST
 * canon state.
 *
 * Implementation: one fetch on mount. Result cached for the session via
 * a module-level Map so re-renders are free. Falsy/loading states
 * render the original children — never flash a wrong ghost.
 *
 * For grid surfaces, prefer feeding a pre-fetched `force` prop from a
 * parent that called /api/ghost/list once. Keeps card count cheap.
 */
import { useEffect, useState } from "react";

const memCache = new Map<number, { ghosted: boolean; discount?: number; ts: number }>();
const TTL_MS = 60_000;

export function GhostedMask({
  tokenId,
  children,
  force,
  variant = "card",
}: {
  tokenId: number;
  children: React.ReactNode;
  /** If parent already knows the ghost state, skip the fetch. */
  force?: boolean;
  /** "card" overlays the children, "hero" replaces them entirely. */
  variant?: "card" | "hero" | "inline";
}) {
  const [ghosted, setGhosted] = useState<boolean | null>(force ?? null);
  const [discount, setDiscount] = useState<number | null>(null);

  useEffect(() => {
    if (force !== undefined) {
      setGhosted(force);
      return;
    }
    const cached = memCache.get(tokenId);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      setGhosted(cached.ghosted);
      setDiscount(cached.discount ?? null);
      return;
    }
    let cancelled = false;
    fetch(`/api/ghost/${tokenId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ghosted?: boolean; discount?: number }) => {
        if (cancelled) return;
        const g = !!j.ghosted;
        memCache.set(tokenId, { ghosted: g, discount: j.discount, ts: Date.now() });
        setGhosted(g);
        setDiscount(j.discount ?? null);
      })
      .catch(() => { if (!cancelled) setGhosted(false); });
    return () => { cancelled = true; };
  }, [tokenId, force]);

  if (!ghosted) return <>{children}</>;

  const pct = discount != null ? Math.round(discount * 100) : null;

  if (variant === "inline") {
    return (
      <span
        style={{
          fontFamily: "var(--mono2)",
          fontSize: 11,
          letterSpacing: "0.22em",
          color: "#7a7a7a",
          textTransform: "uppercase",
        }}
      >
        SIGNAL LOST{pct != null ? ` · ${pct}%↓` : ""}
      </span>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: variant === "hero" ? "100%" : undefined,
        aspectRatio: variant === "card" ? "1 / 1" : undefined,
        background: "#050505",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#5a5a5a",
        fontFamily: "var(--mono2)",
        letterSpacing: "0.32em",
        textTransform: "uppercase",
      }}
      aria-label="Ghosted citizen — signal lost"
    >
      {/* Static-noise backdrop using a tiny inline SVG */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"120\\" height=\\"120\\"><filter id=\\"n\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"1.4\\" numOctaves=\\"2\\" seed=\\"7\\"/><feColorMatrix values=\\"0 0 0 0 0.35  0 0 0 0 0.35  0 0 0 0 0.35  0 0 0 0.9 0\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\"/></svg>")',
          backgroundSize: "120px 120px",
          mixBlendMode: "screen",
          animation: "ghosted-static 0.4s steps(4) infinite",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, fontSize: 11, color: "#888" }}>⬡ 404</div>
      <div style={{ position: "relative", zIndex: 1, fontSize: 13, color: "#aaa", marginTop: 6 }}>SIGNAL LOST</div>
      {pct != null && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: 9,
            color: "#b8423d",
            marginTop: 8,
            letterSpacing: "0.18em",
          }}
        >
          DUMPED · {pct}% UNDER FLOOR
        </div>
      )}
      <style>{`
        @keyframes ghosted-static {
          0% { transform: translate(0,0); }
          25% { transform: translate(-2px,1px); }
          50% { transform: translate(1px,-2px); }
          75% { transform: translate(-1px,2px); }
          100% { transform: translate(0,0); }
        }
      `}</style>
    </div>
  );
}
