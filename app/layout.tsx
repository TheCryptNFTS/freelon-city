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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freeloncity.com"),
  title: {
    default: "404 — FREELON CITY",
    template: "%s · FREELON CITY",
  },
  description: "4040 AI characters you own and train. Each FREELON is an agent that remembers your work — and its whole history travels with the NFT.",
  openGraph: {
    title: "404 — FREELON CITY",
    description: "4040 AI characters you own and train. Each FREELON remembers your work, and its history travels with the NFT.",
    type: "website",
    // Site-wide default OG → the branded product card (every page without its
    // own OG inherits this). Was a flat static /og/home.jpg.
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "404 — FREELON CITY",
    description: "4040 AI characters you own and train. Each FREELON remembers your work, and its history travels with the NFT.",
    images: ["/api/og/universe?b=2"],
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
        {/* Preload the LCP hero image — the FREELON CITY skyline (123KB
            webp). 2026-05-28: swapped from the #4040 NFT render to the
            cityscape so the hero leads with the world, not a product. */}
        <link
          rel="preload"
          as="image"
          fetchPriority="high"
          href="/lore/city.webp"
          type="image/webp"
        />
        <link rel="preconnect" href="https://gateway.pinata.cloud" />
      </head>
      <body>
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
        <EasterEggCode />
        <Ghost404 />
        <QuestToast />
        <CityNotice />
        <ErrorReporter />
      </body>
    </html>
  );
}
