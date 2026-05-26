import type { MetadataRoute } from "next";
import { getAllCitizens, getHonoraries } from "@/lib/citizens";
import { CIVILIZATIONS } from "@/lib/constants";

const BASE = "https://www.freeloncity.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // /rebuild dropped 2026-05-26 — route now 301 redirects to /canon
  // (see next.config redirects). Sitemap should not list redirect
  // sources or destinations users can't reach as their own page.
  const staticRoutes: MetadataRoute.Sitemap = [
    "/", "/origin", "/lore", "/manifesto", "/carrier", "/sync",
    "/pfp", "/tribute", "/citizens", "/civilizations", "/shapes", "/lexicon",
    "/legal", "/legal/terms", "/legal/privacy", "/legal/honorary-notice", "/legal/dmca",
  ].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1.0 : 0.8,
  }));

  // Civilization detail pages
  const civRoutes: MetadataRoute.Sitemap = Object.keys(CIVILIZATIONS).map((slug) => ({
    url: `${BASE}/civilizations/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Vanity 1-of-1 URLs
  const vanityRoutes: MetadataRoute.Sitemap = ["origin-signal", "patient-zero", "genesis-hex", "the-final-signal"].map((slug) => ({
    url: `${BASE}/${slug}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.9,
  }));

  // All 4040 citizen pages
  const citizenRoutes: MetadataRoute.Sitemap = getAllCitizens().map((c) => ({
    url: `${BASE}/citizens/${c.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: c.tier === "One of One" ? 0.9 : c.tier === "Honorary" ? 0.8 : 0.5,
  }));

  // 35 tribute pages
  const tributeRoutes: MetadataRoute.Sitemap = getHonoraries()
    .map((h) => {
      const handle = (h.honoree_handle || "").replace(/^@/, "") || String(h.id);
      return {
        url: `${BASE}/tribute/${handle}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    });

  return [...staticRoutes, ...vanityRoutes, ...civRoutes, ...tributeRoutes, ...citizenRoutes];
}
