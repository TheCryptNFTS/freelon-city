/**
 * Mission framework barrel. Importing this guarantees the catalog has run its
 * registerMission() side effects, then re-exports the public surface.
 */
import "@/lib/missions/catalog";

export * from "@/lib/missions/types";
export * from "@/lib/missions/registry";
export * from "@/lib/missions/telemetry";
