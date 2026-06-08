"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track";

/**
 * Fires ONE `referral_landing` event when a visitor arrives via a shared link
 * (a ?ref= code) or from an external site. This is the single leading indicator
 * for the off-platform-distribution thesis: are FREELONS pulling people back to
 * the site from OTHER people's timelines? Without it we're blind to off-site
 * reach. No PII — only the ref code and the referring hostname.
 */
export function ReferralBeacon() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      const referrer = document.referrer;
      const external = !!referrer && !referrer.includes(window.location.host);
      if (!ref && !external) return;
      let source = "direct";
      if (external) {
        try {
          source = new URL(referrer).hostname;
        } catch {
          source = "external";
        }
      }
      trackEvent("referral_landing", { ref: ref || "none", source });
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
