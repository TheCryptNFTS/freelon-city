/**
 * <Pill /> — rounded inline pill, the single approved shape for the
 * many one-off pills that existed across IdentityGreeting, FloorPill,
 * HoldTheLine, EARN HEX, etc.
 *
 * Variants:
 *   - default: subtle line border, dim ink
 *   - gold:    EARN HEX / FloorPill style
 *   - warning: hold-the-line / collapse style
 *   - civ:     civilization-colored (pass `civColor`)
 *
 * Sizes: sm | md (default).
 *
 * If `href` is given it renders as an <a> (external) or <Link>.
 */
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "default" | "gold" | "warning" | "civ";
type Size = "sm" | "md";

export function Pill({
  children,
  variant = "default",
  size = "md",
  href,
  external,
  civColor,
  className,
  ariaLabel,
  title,
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  external?: boolean;
  civColor?: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const cls = ["ui-pill"];
  if (size === "sm") cls.push("ui-pill--sm");
  if (variant === "gold") cls.push("ui-pill--gold");
  if (variant === "warning") cls.push("ui-pill--warning");
  if (variant === "civ") cls.push("ui-pill--civ");
  if (className) cls.push(className);

  const style = variant === "civ" && civColor
    ? ({ ["--pill-civ" as string]: civColor } as React.CSSProperties)
    : undefined;

  const content = <>{children}</>;

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cls.join(" ")}
          style={style}
          aria-label={ariaLabel}
          title={title}
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        href={href}
        className={cls.join(" ")}
        style={style}
        aria-label={ariaLabel}
        title={title}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={cls.join(" ")} style={style} aria-label={ariaLabel} title={title}>
      {content}
    </span>
  );
}
