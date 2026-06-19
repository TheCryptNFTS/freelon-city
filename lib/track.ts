// Custom-event tracking — thin wrapper over Vercel Web Analytics.
//
// Vercel's track() is a no-op in dev and only sends in production; it's safe to
// call from any client component. No cookies, no personal data: pass only
// coarse, non-identifying props. Keeping this wrapper means the 3 call sites
// (wallet_connected, activation_paid, run_started) never import the vendor
// directly — the analytics backend stays swappable.
import { track } from "@vercel/analytics";

type EventProps = Record<string, string | number | boolean | null>;

// Buy-intent breadcrumb (upgrade audit 2026-06-19). When a visitor clicks an
// OpenSea CTA they leave the site to buy, then often return with no path back to
// AWAKEN their FREELON — the second ETH revenue event, leaking silently. We stamp
// localStorage on the opensea_click event so the homepage greeting can nudge them
// back to /my-citizens to awaken it. Coarse, non-identifying, client-only.
export const BUY_INTENT_KEY = "freelon:buy_intent";

export function trackEvent(name: string, props?: EventProps): void {
  track(name, props);
  if (name === "opensea_click" && typeof window !== "undefined") {
    try { window.localStorage.setItem(BUY_INTENT_KEY, String(Date.now())); } catch { /* private mode */ }
  }
}

/** The buy-intent timestamp (ms) if a recent OpenSea click is still pending a
 *  return, else null. Defaults to a 14-day window. */
export function readBuyIntent(maxAgeMs = 14 * 24 * 60 * 60 * 1000): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(BUY_INTENT_KEY);
    if (!v) return null;
    const t = Number(v);
    if (!Number.isFinite(t) || Date.now() - t > maxAgeMs) return null;
    return t;
  } catch { return null; }
}

export function clearBuyIntent(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(BUY_INTENT_KEY); } catch { /* ignore */ }
}
