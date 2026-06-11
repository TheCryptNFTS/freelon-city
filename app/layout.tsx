import "./globals.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Spotlight } from "@/components/Spotlight";
import { Analytics } from "@/components/Analytics";
import { EasterEggCode } from "@/components/EasterEggCode";
import { Ghost404 } from "@/components/Ghost404";
import { QuestToast } from "@/components/QuestToast";
import { CityNotice } from "@/components/CityNotice";
import { FourOFourEvent } from "@/components/FourOFourEvent";
import { ErrorReporter } from "@/components/ErrorReporter";
import { CollapseBanner } from "@/components/CollapseBanner";
import { ChromeGate } from "@/components/ChromeGate";
import { ReferralBeacon } from "@/components/ReferralBeacon";
import { StyledJsxRegistry } from "@/components/StyledJsxRegistry";

// T3 2026-06-11 — share defaults must SELL. Every page without its own
// openGraph/twitter block inherits these, and "404 — FREELON CITY" as an
// og:title made shared links preview as a broken page on X. The 404 motif
// stays in on-page lore + inside the OG image renderers (app/api/og/*) —
// never again in the share-card TITLE tags. Under 155 chars, copy-safe.
const SHARE_TITLE = "FREELON CITY — own and train an AI citizen";
const SHARE_DESC =
  "Own and train an AI citizen of FREELON CITY. Its memory and work history travel with the NFT — through every sale. Try one free, no wallet needed.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freeloncity.com"),
  title: {
    default: "404 — FREELON CITY",
    template: "%s · FREELON CITY",
  },
  description: SHARE_DESC,
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESC,
    type: "website",
    // Site-wide default OG → the branded product card (every page without its
    // own OG inherits this). Was a flat static /og/home.jpg.
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* 2026-05-28 studio-pass Track 2 — "Editorial Graffiti" type system.
           Clash Display = display face (headlines); Clash Grotesk = labels/
           UI (--mono2); Satoshi = body; Space Mono = raw data (--mono).
           PERF 2026-06-11: the fontshare + Google Fonts CSS links here were
           ~880ms of render-blocking on every route — all four families are
           now SELF-HOSTED (public/fonts/*.woff2, @font-face in globals.css,
           same family names + font-display: swap). Preload only the three
           faces that paint above the fold; the rest load on demand. */}
        <link rel="preload" as="font" type="font/woff2" href="/fonts/clash-display-600.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/clash-grotesk-400.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/satoshi-400.woff2" crossOrigin="anonymous" />
        {/* BUG-13 fix 2026-05-26: added /favicon.ico (multi-size ICO
           with 16/32/48px embedded) so browsers' implicit
           /favicon.ico request gets a 200 instead of a 404. The
           explicit <link rel="icon" href="/favicon.png"> keeps the
           higher-res PNG for browsers that prefer it. */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* PERF 2026-06-11: the /lore/city.webp hero-backdrop preload that
            lived here pushed 125KB of fetchPriority=high bytes onto EVERY
            route — it is homepage-only art. The preload moved to
            app/page.tsx (ReactDOM.preload), scoped to the page that paints it. */}
        <link rel="preconnect" href="https://gateway.pinata.cloud" />
      </head>
      <body>
        <StyledJsxRegistry>
        <a href="#main" className="skip-link">Skip to main content</a>
        {/* Global chrome is hidden on the full-screen agent-workspace routes
            (see ChromeGate) so the Header/Footer can't bleed through the
            workspace shell. */}
        <ChromeGate>
        <Header />
        {/* Lore-framed status banner — only renders when the city is in
            measurable collapse. 2026-05-28 LCP fix: this is an async server
            component that awaits getCollapseState() → a server-to-self
            fetch to /api/hex-index (uncached, hits OpenSea). Unwrapped, it
            blocked the entire HTML stream — including the hero LCP element —
            for the duration of that fetch (measured ~17s p-tail at baseline).
            Wrapping in Suspense lets the hero stream immediately; the banner
            streams in when its data resolves. Fallback is null (the banner
            also renders null when the city is healthy), so zero layout shift. */}
        <Suspense fallback={null}>
          <CollapseBanner />
        </Suspense>
        {/* 2026-05-29 — CityFeedTicker removed (founder de-cheap pass). A
            scrolling sales/floor/holders price-crawl in tiny monospace was
            the textbook "2018 crypto dashboard" tell — AAA game sites lead
            with art, not a Bloomberg ribbon. Component kept at
            components/CityFeedTicker.tsx if a reskinned status line is ever
            wanted, but it no longer renders site-wide. */}
        <FourOFourEvent />
        </ChromeGate>
        <main id="main">{children}</main>
        <ChromeGate>
        <Footer />
        </ChromeGate>
        <ScrollReveal />
        <Spotlight />
        <Analytics />
        {/* T11 2026-06-11 — referral_landing beacon is now GLOBAL: ?ref= arrivals
            on / and /start (and every other route) were invisible while the
            beacon only lived on /demo, /report and /carrier-of-the-week. Those
            per-page mounts were removed (double-fire). Fires once per hard load;
            layout persists across client navigations, so no re-fires. */}
        <ReferralBeacon />
        <EasterEggCode />
        <Ghost404 />
        <QuestToast />
        <CityNotice />
        <ErrorReporter />
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
