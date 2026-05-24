/**
 * <Panel /> — the dense Bloomberg-terminal card.
 *
 * Variants:
 *   - default: 168px min, state strip left edge, label/state header,
 *     primary value, optional secondary, optional KPIs, optional CTA
 *   - inert:   plain bordered block (DoctrineFragment-style)
 *
 * The state prop drives both the left-strip color AND the small
 * in-header status dot + label. Pass `primaryColor` to override the
 * primary number color (used for civ-colored leaders, hex direction).
 */
import Link from "next/link";
import { ReactNode } from "react";
import { STATE_COLOR, type SystemState } from "./tokens";
import { Kpis } from "./KpiRow";
import { StatusDot } from "./StatusDot";

export function Panel({
  state = "active",
  label,
  primary,
  primaryColor,
  secondary,
  rows,
  href,
  external,
  cta,
  variant = "default",
  className,
  children,
}: {
  state?: SystemState;
  label?: string;
  primary?: ReactNode;
  primaryColor?: string;
  secondary?: string;
  rows?: ReadonlyArray<readonly [string, string]>;
  href?: string;
  external?: boolean;
  cta?: string;
  variant?: "default" | "inert";
  className?: string;
  children?: ReactNode;
}) {
  const stripColor = STATE_COLOR[state];
  const cls = ["ui-panel"];
  if (variant === "inert") cls.push("ui-panel--inert");
  if (cta) cls.push("ui-panel--has-cta");
  if (className) cls.push(className);

  const inner = (
    <article className={cls.join(" ")}>
      <div
        aria-hidden
        className={`ui-panel__strip${state === "offline" ? " ui-panel__strip--offline" : ""}`}
        style={{ background: stripColor }}
      />

      {(label || state) && (
        <div className="ui-panel__head">
          {label && <span className="kicker">{label}</span>}
          <span
            className="kicker"
            style={{ color: stripColor, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <StatusDot state={state} size="sm" />
            {state}
          </span>
        </div>
      )}

      {primary !== undefined && primary !== null && (
        <div
          className="ui-panel__primary"
          style={primaryColor ? { color: primaryColor } : undefined}
        >
          {primary}
        </div>
      )}

      {secondary && <div className="ui-panel__secondary">{secondary}</div>}

      {rows && rows.length > 0 && <Kpis rows={rows} />}

      {children}

      {cta && (
        <span className="ui-panel__cta" style={{ color: stripColor }}>
          {cta} →
        </span>
      )}
    </article>
  );

  if (!href) return inner;
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className="ui-panel-link">{inner}</a>
  ) : (
    <Link href={href} className="ui-panel-link">{inner}</Link>
  );
}
