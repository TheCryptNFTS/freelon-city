/**
 * Phase 1 design primitives.
 *
 * Single import surface so feature files never reach into individual
 * files. Add new primitives only here — do not let any feature
 * component reinvent a card, pill, dot, or banner.
 */
export { Panel } from "./Panel";
export { Pill } from "./Pill";
export { StatusDot } from "./StatusDot";
export { Kpis, KpiRow } from "./KpiRow";
export { ActionCard } from "./ActionCard";
export { SectionHeader } from "./SectionHeader";
export { LiveIndicator } from "./LiveIndicator";
export { ResponsiveGrid, MobileStack } from "./ResponsiveGrid";
export { Banner } from "./Banner";
export { STATE_COLOR, type SystemState } from "./tokens";
