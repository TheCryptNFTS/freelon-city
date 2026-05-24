/**
 * <ResponsiveGrid /> + <MobileStack /> — two thin layout primitives.
 *
 * <ResponsiveGrid /> is the joined-edges Bloomberg grid (1px gap on a
 * line-colored background) that collapses 3→2→1 columns. Pass
 * `variant="cards"` for the gapped non-joined version used by
 * DoThisNow.
 *
 * <MobileStack /> is a simple vertical stack with token-spaced gap —
 * used wherever a single-column flow needs even spacing.
 */
import type { CSSProperties, ReactNode } from "react";

export function ResponsiveGrid({
  cols = 3,
  colsMd = 2,
  variant = "default",
  className,
  children,
  style,
}: {
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  colsMd?: 1 | 2 | 3;
  variant?: "default" | "cards";
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const cls = ["ui-grid"];
  if (variant === "cards") cls.push("ui-grid--cards");
  if (className) cls.push(className);
  return (
    <div
      className={cls.join(" ")}
      style={{
        ["--ui-cols" as string]: String(cols),
        ["--ui-cols-md" as string]: String(colsMd),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function MobileStack({
  gap = "var(--s-3)",
  className,
  children,
  style,
}: {
  gap?: string;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={["ui-stack", className].filter(Boolean).join(" ")}
      style={{ gap, ...style }}
    >
      {children}
    </div>
  );
}
