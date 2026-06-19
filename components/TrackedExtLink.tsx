"use client";

import { trackEvent } from "@/lib/track";

/**
 * Outbound anchor (target=_blank) that fires a NAMED funnel event on click, so
 * SERVER pages can measure cross-property handoffs without becoming client
 * components. Generic twin of TrackedOpenSeaLink. `from` is a coarse surface
 * label only. (2026-06-16 — instruments the city→game handoff, which opened an
 * external tab with no event, leaving the "play on borrowed signal" ramp dark.)
 */
export function TrackedExtLink({
  href,
  event,
  from,
  className,
  style,
  children,
}: {
  href: string;
  event: string;
  from?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      className={className}
      style={style}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent(event, from ? { from } : undefined)}
    >
      {children}
    </a>
  );
}
