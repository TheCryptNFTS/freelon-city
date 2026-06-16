"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/track";

/**
 * Internal next/link that fires a named funnel event on click, so SERVER pages
 * (home, /start, …) can measure intra-site click-through WITHOUT becoming client
 * components — the internal-nav twin of TrackedOpenSeaLink. `from` is a coarse
 * surface label only, never wallet/token/user data. (2026-06-16 — instruments the
 * previously-dark top of the funnel: the hero "MEET A CITIZEN" click.)
 */
export function TrackedLink({
  href,
  event,
  from,
  className,
  prefetch = false,
  children,
}: {
  href: string;
  event: string;
  from?: string;
  className?: string;
  prefetch?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      className={className}
      href={href}
      prefetch={prefetch}
      onClick={() => trackEvent(event, from ? { from } : undefined)}
    >
      {children}
    </Link>
  );
}
