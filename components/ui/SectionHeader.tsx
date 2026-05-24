/**
 * <SectionHeader /> — the small kicker bar with optional right-side
 * live indicator. Sits above any data grid.
 */
import type { ReactNode } from "react";
import { StatusDot } from "./StatusDot";
import type { SystemState } from "./tokens";

export function SectionHeader({
  label,
  live,
  liveState = "active",
  liveLabel,
  right,
}: {
  label: string;
  /** Show a pulsing dot + label on the right side. */
  live?: boolean;
  liveState?: SystemState;
  liveLabel?: string;
  /** Override the right slot with any node (mutually exclusive with live). */
  right?: ReactNode;
}) {
  return (
    <header className="ui-section-header">
      <span>{label}</span>
      {right ? (
        right
      ) : live ? (
        <span className="ui-section-header__live" style={{ color: `var(--state-${liveState})` }}>
          <StatusDot state={liveState} size="md" />
          {liveLabel ?? `STATUS · ${liveState.toUpperCase()}`}
        </span>
      ) : null}
    </header>
  );
}
