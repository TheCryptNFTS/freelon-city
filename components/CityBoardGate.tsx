"use client";

import { usePathname } from "next/navigation";

/**
 * Hides its children on the HOMEPAGE only (2026-06-30 placement pass). The City
 * Board (components/FourOFourEvent.tsx) is a rotating INSIDER/live-city newsboard
 * — Fifth Bracket countdown, daily signal reset, agent Versus/Chronicle. Rendered
 * site-wide by the layout it sits ABOVE the hero, so the literal first pixel a cold
 * visitor sees on the front door is an in-group countdown that answers no question
 * they're asking. The placement council's rule: the City Board must not be the
 * first thing a cold visitor sees. On "/" the homepage renders its own demoted
 * instance lower down (after the pillars/proof/collections); everywhere else the
 * site-wide board is unchanged. Mirrors CollapseBannerGate's safe-default pattern.
 */
const HOME = "/";

export function CityBoardGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Safe default: SHOW unless we positively know we're on the homepage, so a
  // null/uncertain pathname never hides the board everywhere.
  if (pathname === HOME) return null;
  return <>{children}</>;
}

export default CityBoardGate;
