import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "dweb.link" },
    ],
  },
  async rewrites() {
    return [
      { source: "/origin-signal",    destination: "/citizens/1" },
      { source: "/patient-zero",     destination: "/citizens/404" },
      { source: "/genesis-hex",      destination: "/citizens/1337" },
      { source: "/the-final-signal", destination: "/citizens/4040" },
    ];
  },
  // 2026-05-26 dead-route cleanup. Four orphan pages (no inbound nav
  // links) become permanent redirects to their nearest semantic parent.
  // SEO best practice over noindex-and-leave: preserves any external/
  // Discord bookmark traffic while removing maintenance surface. The
  // page.tsx files are deleted in the same PR; this redirect rule owns
  // the URL going forward. `permanent: true` sends a 308 (treated as
  // 301 by search engines).
  async redirects() {
    return [
      { source: "/flex",         destination: "/tribute", permanent: true },
      { source: "/doppelganger", destination: "/sync",    permanent: true },
      { source: "/regret",       destination: "/numbers", permanent: true },
      { source: "/rebuild",      destination: "/canon",   permanent: true },
      // 2026-05-27 — /hold-the-line renamed to /synthesis to drop
      // crypto-degen war framing in favor of the Synthesis doctrine
      // (Blue Synthesis: tech monks · network civilization). The mechanic
      // is unchanged; only the route name + page copy were updated.
      { source: "/hold-the-line", destination: "/synthesis", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Long-term immutable cache for static binary assets in /public/.
        // These directories hold pre-baked images (heroes, OG cards, civ
        // plates, glyphs, etc.) whose URLs are stable — if content changes,
        // the filename changes. Default Vercel cache-control for /public/ is
        // max-age=0 must-revalidate, which forces a 304 round-trip on every
        // visit. Switching to one-year immutable removes that overhead.
        // 2026-05-27 perf debug.
        source: "/:dir(heroes|og|atmos|civs|glyphs|lore|origin|shop|social|textures|generated)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          // Clickjacking protection
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // MIME-sniffing protection
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer leak control
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable unused browser APIs
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Belt-and-braces HSTS (Vercel already sets it, but make it explicit)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js inlines a hydration script; allow inline + eval for now (tighten later with nonces)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io",
              "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://cdn.fontshare.com",
              "font-src 'self' https://cdn.fontshare.com data:",
              "img-src 'self' data: blob: https://gateway.pinata.cloud https://ipfs.io https://dweb.link",
              "connect-src 'self' https://api.opensea.io https://gateway.pinata.cloud https://cloudflare-eth.com https://eth-mainnet.public.blastapi.io https://eth.llamarpc.com https://ethereum.publicnode.com https://rpc.ankr.com https://*.upstash.io https://api.x.com https://plausible.io",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self' https://twitter.com https://x.com",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default config;
