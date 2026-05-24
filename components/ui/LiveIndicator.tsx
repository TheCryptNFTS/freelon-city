/**
 * <LiveIndicator /> — small inline "status · live" badge.
 *
 * Used in section headers and panel corners. For richer headers prefer
 * <SectionHeader live />.
 */
import { StatusDot } from "./StatusDot";
import type { SystemState } from "./tokens";

export function LiveIndicator({
  state = "active",
  label,
}: {
  state?: SystemState;
  label?: string;
}) {
  return (
    <span
      className="kicker"
      style={{ color: `var(--state-${state})`, display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <StatusDot state={state} size="md" />
      {label ?? `STATUS · ${state.toUpperCase()}`}
    </span>
  );
}
