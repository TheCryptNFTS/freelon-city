"use client";

import { useState } from "react";
import { imageUrl } from "@/lib/constants";

/**
 * CitizenAvatar — the ONE premium way to show a FREELON at small size.
 *
 * The collection art is a full-body crystal-headed figure whose distinctive
 * identity (the crystal head + glowing hex gem) lives in the UPPER THIRD. Crammed
 * into a tiny center-cropped square it read as a featureless "little alien blob"
 * (Billy, 2026-06-16). This component fixes that everywhere:
 *   - HEAD CROP: object-position pulls the frame up (~20%) so the face/head shows.
 *   - HEX FRAME: clipped to the brand hexagon (⬡) with a machined-gold edge ring —
 *     turns a generic thumbnail into a deliberate, recognizable citizen sigil.
 *   - GLYPH FALLBACK: a missing/broken image degrades to a ⬡ + id chip, never a
 *     broken-image icon.
 * Large/hero renders that already look good keep using their own <img>; this is for
 * the small contexts (leaderboards, breadcrumbs, grids, pickers).
 */

// Pointy-top hexagon (matches the ⬡ gem orientation in the collection art).
const HEX = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
const GOLD_RING = "linear-gradient(155deg, #ffe9b0 0%, #e7c074 34%, #c8973f 70%, #8c6320 100%)";

type Shape = "hex" | "round" | "rounded";

export function CitizenAvatar({
  tokenId,
  src,
  size = 44,
  alt,
  ring = GOLD_RING,
  shape = "hex",
  objectPosition = "50% 20%",
  lazy = true,
  className,
  style,
}: {
  tokenId?: number;
  /** Explicit image src (e.g. a local hero webp). Falls back to imageUrl(tokenId). */
  src?: string;
  size?: number;
  alt?: string;
  /** Ring fill (gradient or color). Pass a civ color for a faction-tinted edge. */
  ring?: string;
  shape?: Shape;
  objectPosition?: string;
  lazy?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = src ?? (tokenId != null ? imageUrl(tokenId) : undefined);
  const label = alt ?? (tokenId != null ? `FREELON #${tokenId.toString().padStart(4, "0")}` : "FREELON citizen");

  // Ring thickness scales with size but stays crisp at small sizes.
  const pad = Math.max(1.5, Math.round(size * 0.045));
  const clip = shape === "hex" ? HEX : undefined;
  const radius = shape === "round" ? "50%" : shape === "rounded" ? Math.round(size * 0.26) : undefined;

  const outer: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    display: "grid",
    background: ring,
    padding: pad,
    boxSizing: "border-box",
    ...(clip ? { clipPath: clip } : { borderRadius: radius }),
    // A soft drop to lift the sigil off dark backgrounds.
    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
    ...style,
  };

  const inner: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition,
    display: "block",
    background: "#0c0b10",
    ...(clip ? { clipPath: clip } : { borderRadius: radius != null ? Math.max(0, (radius as number) - pad) : undefined }),
  };

  return (
    <span className={className} style={outer} aria-label={label} role="img">
      {resolved && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={label}
          loading={lazy ? "lazy" : undefined}
          decoding="async"
          style={inner}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          style={{
            ...inner,
            display: "grid",
            placeItems: "center",
            color: "rgba(233,201,132,0.85)",
            fontFamily: "var(--mono2), monospace",
            fontSize: Math.max(9, Math.round(size * 0.26)),
            letterSpacing: "0.04em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          <span aria-hidden style={{ fontSize: Math.round(size * 0.34), opacity: 0.9 }}>⬡</span>
        </span>
      )}
    </span>
  );
}

export default CitizenAvatar;
