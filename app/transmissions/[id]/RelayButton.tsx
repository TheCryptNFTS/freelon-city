"use client";

import { trackEvent } from "@/lib/track";

/**
 * Relay-to-X button for a single transmission. Fires a `transmission_share`
 * custom event on click so we can measure share-intent (the page is a server
 * component, so this client wrapper exists only to carry the onClick). The
 * embedded ?ref=tx- link in the href lets ReferralBeacon measure inbound
 * clicks from real posts — together they give both halves of the share funnel.
 */
export function RelayButton({ id, href }: { id: string; href: string }) {
  return (
    <a
      className="btn btn-primary"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("transmission_share", { id })}
    >
      <span className="ttl">RELAY TO X →</span>
    </a>
  );
}
