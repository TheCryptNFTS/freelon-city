"use client";

import { usePathname } from "next/navigation";

/**
 * Hides its children on the COLD ACQUISITION surfaces (the homepage + the free
 * demo) and shows them everywhere else (2026-06-17). A "⚠ CITY STATUS · COLLAPSE ·
 * EARNING −50%" strip is in-canon drama that holders and interior visitors enjoy —
 * but to a first-time stranger on the front door it reads as "this thing is broken,
 * do not enter." The transparency posture is right; only its LOCATION was wrong. The
 * collapse banner (a server component) is rendered by the layout and passed in as
 * children; this gate just decides whether to mount it for the current route.
 */
const COLD_SURFACES = new Set(["/", "/demo"]);

export function CollapseBannerGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Safe default: SHOW unless we positively know we're on a cold surface, so a
  // null/uncertain pathname never hides the banner everywhere.
  if (pathname && COLD_SURFACES.has(pathname)) return null;
  return <>{children}</>;
}

export default CollapseBannerGate;
