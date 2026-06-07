import type { CSSProperties, ReactNode } from "react";

/**
 * FRAMED AGENT — the one recurring object across the whole product.
 *
 * The same hex-framed character, lit by its civilization color, appears on the
 * collections card, the token identity page, the connected-homepage rail, and
 * the agent-workspace first-run reveal. Reusing ONE component (at different
 * sizes, themed by a single civ-color value) is what makes those surfaces read
 * as a single premium product instead of stitched-together pages.
 *
 * Pure presentational (no client hooks) so it renders in server components.
 * Pass `media` to override the default <img> (e.g. a looping <video> for the
 * video-only collections).
 */
export function FramedAgent({
  art,
  civColor,
  size = 120,
  alt = "",
  name,
  stamp,
  media,
  className,
  priority = false,
}: {
  art: string;
  /** Civilization accent — any CSS color or var(); drives the rim light + halo. */
  civColor: string;
  size?: number;
  alt?: string;
  name?: string;
  stamp?: string;
  /** Override the default <img> (e.g. a <video> for video-only collections). */
  media?: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  const radius = Math.max(12, Math.round(size * 0.12));
  const frameStyle: CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    borderRadius: radius,
    overflow: "hidden",
    background: "#0c0b10",
    border: `1px solid color-mix(in srgb, ${civColor} 55%, transparent)`,
    boxShadow: `0 0 0 1px color-mix(in srgb, ${civColor} 22%, transparent), 0 18px 44px -16px rgba(0,0,0,0.85), 0 0 34px -6px color-mix(in srgb, ${civColor} 38%, transparent), inset 0 1px 0 rgba(255,255,255,0.05)`,
  };
  const haloStyle: CSSProperties = {
    position: "absolute",
    inset: `-${Math.round(size * 0.22)}px`,
    background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${civColor} 32%, transparent), transparent 62%)`,
    filter: "blur(4px)",
    pointerEvents: "none",
    zIndex: 0,
  };

  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: name || stamp ? 12 : 0 }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <div aria-hidden style={haloStyle} />
        <div style={frameStyle}>
          {media ?? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={art}
              alt={alt}
              loading={priority ? "eager" : "lazy"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "relative", zIndex: 1 }}
            />
          )}
        </div>
      </div>
      {(name || stamp) && (
        <div style={{ textAlign: "center", maxWidth: Math.max(size * 1.8, 220) }}>
          {name && (
            <div style={{ fontFamily: "var(--display, ui-sans-serif)", fontSize: Math.round(size * 0.16), lineHeight: 1.05, color: "#f2efe6" }}>
              {name}
            </div>
          )}
          {stamp && (
            <div style={{ fontFamily: "var(--mono2, ui-monospace)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: civColor, marginTop: 6 }}>
              {stamp}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
