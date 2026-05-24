/**
 * Phase 1 shared token references for primitives that need to read
 * state colors from TypeScript (e.g. inline strip color of <Panel>).
 *
 * These string values MUST stay in sync with the --state-* CSS
 * variables in app/globals.css. The CSS variables are the source of
 * truth for the rendered page; this map exists only so that React
 * components can pass a color into a `style={{ background: ... }}`
 * for cases where a class-only modifier is awkward (e.g. dynamic
 * civ colors).
 */

export type SystemState = "active" | "surge" | "unstable" | "warning" | "danger" | "offline";

export const STATE_COLOR: Record<SystemState, string> = {
  active:   "var(--state-active)",
  surge:    "var(--state-surge)",
  unstable: "var(--state-unstable)",
  warning:  "var(--state-warning)",
  danger:   "var(--state-danger)",
  offline:  "var(--state-offline)",
};
