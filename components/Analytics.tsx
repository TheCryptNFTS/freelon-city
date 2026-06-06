// Vercel Web Analytics — cookieless, privacy-friendly, no account or config.
// Pageviews are automatic; custom events fire via lib/track.ts (trackEvent).
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

export function Analytics() {
  return <VercelAnalytics />;
}
