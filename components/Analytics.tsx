// Plausible analytics — script-only, no cookies, GDPR-friendly.
// Activates only when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set.
import Script from "next/script";

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
