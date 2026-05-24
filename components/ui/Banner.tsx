/**
 * <Banner /> — the urgency strip used by CollapseBanner and
 * HoldTheLineBanner.
 *
 * variant="top" renders edge-to-edge (sticky under header); variant=
 * "block" renders as a rounded contained block with token-defined
 * outer margin.
 */
import type { ReactNode } from "react";

export function Banner({
  variant = "block",
  role = "status",
  children,
  className,
}: {
  variant?: "top" | "block";
  role?: string;
  children: ReactNode;
  className?: string;
}) {
  const cls = ["ui-banner"];
  if (variant === "top") cls.push("ui-banner--top");
  if (variant === "block") cls.push("ui-banner--block");
  if (className) cls.push(className);
  return (
    <section role={role} aria-live="polite" className={cls.join(" ")}>
      {children}
    </section>
  );
}
