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
  async headers() {
    return [
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
