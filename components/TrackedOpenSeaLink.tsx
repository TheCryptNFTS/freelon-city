"use client";

import { trackEvent } from "@/lib/track";

/**
 * Outbound OpenSea anchor that fires the canonical `opensea_click` {from}
 * funnel event — the same event the demo wall already emits (T11
 * 2026-06-11). Exists so SERVER pages (home, /start, collections/[slug])
 * can measure buy-intent clicks without becoming client components.
 * `from` is a coarse surface label only — never wallet/token/user data.
 */
export function TrackedOpenSeaLink({
  href,
  from,
  className,
  children,
}: {
  href: string;
  from: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("opensea_click", { from })}
    >
      {children}
    </a>
  );
}
