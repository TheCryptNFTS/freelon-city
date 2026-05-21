import "./globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Spotlight } from "@/components/Spotlight";
import { Analytics } from "@/components/Analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://freeloncity.com"),
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
        <link
          href="https://api.fontshare.com/v2/css?f[]=tanker@400&f[]=cabinet-grotesk@500,700,800,900&f[]=satoshi@300,400,500,700,900&f[]=jetbrains-mono@400,500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* Preload the LCP hero image — Final Signal #4040 — local mirror, no IPFS lag */}
        <link rel="preload" as="image" fetchPriority="high" href="/heroes/4040.webp" type="image/webp" />
        <link rel="preconnect" href="https://gateway.pinata.cloud" />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <ScrollReveal />
        <Spotlight />
        <Analytics />
      </body>
    </html>
  );
}
