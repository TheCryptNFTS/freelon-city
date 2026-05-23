import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Only block Next internals. /api/ is intentionally NOT disallowed
        // because Twitter / Discord / iMessage card crawlers don't reliably
        // honor Allow overrides on Disallow prefixes — they were blocking
        // /api/og/* (the OG images) and rendering the gray placeholder on
        // every share. The non-OG /api routes return JSON or 4xx to bots,
        // so indexing them is harmless.
        disallow: ["/_next/"],
      },
    ],
    sitemap: "https://www.freeloncity.com/sitemap.xml",
    host: "https://www.freeloncity.com",
  };
}
