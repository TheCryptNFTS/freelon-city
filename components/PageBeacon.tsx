"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track";

/**
 * Fire-once page-entry beacon (ReferralBeacon pattern, T11 2026-06-11).
 * Mounted by a SERVER page to emit a single named funnel event on first
 * client render — `play_entered` on /play, `start_viewed` on /start —
 * without converting the page to a client component. Payload is the event
 * name only: no PII, no path, nothing identifying.
 */
export function PageBeacon({ name }: { name: string }) {
  useEffect(() => {
    try {
      trackEvent(name);
    } catch {
      /* ignore */
    }
  }, [name]);
  return null;
}
