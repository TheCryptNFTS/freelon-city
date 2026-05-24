/**
 * <CivGlyph /> — renders an SVG civilization symbol tinted to any color.
 *
 * The raw SVGs in /public/glyphs/civs use `stroke="currentColor"` so they
 * can adopt the civ color. <img> can't apply currentColor, so we use CSS
 * mask-image: the SVG becomes a mask, the color is the background. Works
 * with any civ color, no inlining required.
 */

export function CivGlyph({
  slug,
  color,
  size = 18,
  className,
  style,
  title,
}: {
  slug: string;
  color: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const url = `url('/glyphs/civs/${slug}.svg')`;
  return (
    <span
      role="img"
      aria-label={title || `${slug} symbol`}
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/**
 * <HexGlyph /> — the same trick for the 5 hex variants
 * (filled / outline / pulse / fractured / sealed).
 */
export function HexGlyph({
  variant = "filled",
  color = "currentColor",
  size = 16,
  className,
  style,
}: {
  variant?: "filled" | "outline" | "pulse" | "fractured" | "sealed";
  color?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const url = `url('/glyphs/hex/${variant}.svg')`;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
