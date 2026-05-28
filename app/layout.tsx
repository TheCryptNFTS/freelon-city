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
import { CityFeedTicker } from "@/components/CityFeedTicker";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freeloncity.com"),
  title: {
    default: "404 — FREELON CITY",
    template: "%s · FREELON CITY",
  },
  description: "4040 citizens of a Martian civilization built around the missing hex from X. 10 Signal civilizations · 7 castes · 16 sacred shapes.",
  openGraph: {
    title: "404 — FREELON CITY",
    description: "4040 citizens. 10 civilizations. 7 castes. 16 sacred shapes. The hex didn't disappear. It moved.",
    type: "website",
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "404 — FREELON CITY",
    description: "4040 citizens. 10 civilizations. 7 castes. 16 sacred shapes. The hex didn't disappear. It moved.",
    images: ["/og/home.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* 2026-05-28 studio-pass Track 2 — "Editorial Graffiti" type system.
           Clash Display (Fontshare) is the new display face (headlines);
           Space Mono (Google) replaces IBM Plex Mono for labels/kickers.
           Satoshi stays as the BODY grotesque (Clash is display-only, not a
           text face). IBM Plex Mono kept loaded as a fallback for any
           data-dense surface that needs Space Mono dialed back later. */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=clash-grotesk@400,500,600&f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* BUG-13 fix 2026-05-26: added /favicon.ico (multi-size ICO
           with 16/32/48px embedded) so browsers' implicit
           /favicon.ico request gets a 200 instead of a 404. The
           explicit <link rel="icon" href="/favicon.png"> keeps the
           higher-res PNG for browsers that prefer it. */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* Preload the LCP hero image — Final Signal #4040 — local mirror, no
            IPFS lag. imageSrcSet/imageSizes let the browser preload the
            mobile variant (800w ~75KB) on small screens instead of the
            1024w master (~146KB). Matches the img tag's srcset/sizes on
            the homepage hero. 2026-05-27 LCP debug. */}
        <link
          rel="preload"
          as="image"
          fetchPriority="high"
          href="/heroes/4040.webp"
          imageSrcSet="/heroes/4040-800.webp 800w, /heroes/4040.webp 1024w"
          imageSizes="(max-width: 980px) 100vw, 50vw"
          type="image/webp"
        />
        <link rel="preconnect" href="https://gateway.pinata.cloud" />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
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
        {/* Persistent site-wide ticker — sales / red signals / floor /
            holders / alerts. Constant motion = the city feels alive on
            every page, not just the homepage. */}
        <CityFeedTicker />
        <FourOFourEvent />
        <main id="main">{children}</main>
        <Footer />
        <ScrollReveal />
        <Spotlight />
        <Analytics />
        <EasterEggCode />
        <Ghost404 />
        <QuestToast />
        <CityNotice />
        <ErrorReporter />
      </body>
    </html>
  );
}
