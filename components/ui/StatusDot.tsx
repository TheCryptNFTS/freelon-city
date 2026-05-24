/**
 * <StatusDot /> — single-purpose pulsing color dot.
 *
 * Use everywhere a "live" / "warning" / "offline" indicator is needed.
 * Reads color from a SystemState OR an explicit color string (for civ
 * colors which live outside the state palette).
 */
import { STATE_COLOR, type SystemState } from "./tokens";

export function StatusDot({
  state,
  color,
  size = "md",
  glow = true,
  className,
}: {
  state?: SystemState;
  color?: string;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  className?: string;
}) {
  const c = color ?? (state ? STATE_COLOR[state] : "var(--ink-dim)");
  const cls = ["ui-dot"];
  if (size === "sm") cls.push("ui-dot--sm");
  if (size === "lg") cls.push("ui-dot--lg");
  if (glow && state !== "offline") cls.push("ui-dot--glow");
  if (className) cls.push(className);
  return (
    <span
      aria-hidden
      className={cls.join(" ")}
      style={{ background: c, color: c }}
    />
  );
}
