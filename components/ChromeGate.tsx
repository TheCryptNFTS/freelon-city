"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the global site chrome (Header / Footer / banners) on the full-screen
 * agent-workspace routes. The workspace (`/agent/[id]`, `/agent/c/[slug]/[id]`)
 * is a self-contained app that owns the whole viewport; without this gate the
 * global Header + Footer render in normal flow behind the fixed workspace shell
 * and visually bleed THROUGH it (the footer's ON-CHAIN/NAVIGATE/LEGAL columns
 * overlapping the chat). Children are server components passed through, so this
 * only decides whether to render them — it adds no other behavior.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && (pathname === "/agent" || pathname.startsWith("/agent/"))) return null;
  // /embed/[id] is the chrome-free Living PFP widget meant to be iframed into
  // holders' own pages — site Header/Footer/nav must never render inside it.
  if (pathname && pathname.startsWith("/embed/")) return null;
  return <>{children}</>;
}
