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
        ],
      },
    ];
  },
};

export default config;
