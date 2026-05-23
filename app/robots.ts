import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/og/* must be allowed so X/Discord/iMessage card crawlers
        // can fetch our Open Graph images. Block the rest of /api/.
        allow: ["/", "/api/og/"],
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: "https://www.freeloncity.com/sitemap.xml",
    host: "https://www.freeloncity.com",
  };
}
