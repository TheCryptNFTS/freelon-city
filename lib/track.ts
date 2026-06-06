// Custom-event tracking — thin wrapper over Vercel Web Analytics.
//
// Vercel's track() is a no-op in dev and only sends in production; it's safe to
// call from any client component. No cookies, no personal data: pass only
// coarse, non-identifying props. Keeping this wrapper means the 3 call sites
// (wallet_connected, activation_paid, run_started) never import the vendor
// directly — the analytics backend stays swappable.
import { track } from "@vercel/analytics";

type EventProps = Record<string, string | number | boolean | null>;

export function trackEvent(name: string, props?: EventProps): void {
  track(name, props);
}
