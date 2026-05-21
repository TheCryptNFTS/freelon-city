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
};

export default config;
