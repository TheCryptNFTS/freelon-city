import type { MetadataRoute } from "next";
import { getAllCitizens, getHonoraries } from "@/lib/citizens";
import { CIVILIZATIONS } from "@/lib/constants";
import { COLLECTION_SLUGS } from "@/lib/collections-data";

const BASE = "https://www.freeloncity.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // /rebuild dropped 2026-05-26 — route now 301 redirects to /canon.
  // /lore dropped 2026-05-27 — prose merged into /canon's expanded
  // origin + civilizations tabs; /lore now 308 redirects to
  // /canon#civilizations. Sitemap should not list redirect sources.
  const staticRoutes: MetadataRoute.Sitemap = [
    // The 5 pillars first, then supporting pages. Redirect sources omitted.
    "/", "/citizens", "/crypt-tcg", "/play", "/dashboard", "/earn",
    "/sync", "/collections", "/civilizations", "/shop", "/transmissions",
    "/canon", "/tribute", "/press", "/help", "/developers",
    // SEO #29 (2026-06-27) — indexable public content surfaces that were missing.
    // VERIFIED real pages with their own metadata (not redirects, not noindex):
    // /demo + /proof = cold-acquisition surfaces with dedicated OG cards; /report
    // = the weekly Signal Report ritual; /live = the live city feed;
    // /carrier-of-the-week = weekly public content; /mars = the static MARS COMMAND
    // game (rewrite, full meta + canonical). EXCLUDED on verification: /remember,
    // /start, /archive (all redirect now), /world/city (noindex prototype slice).
    "/demo", "/proof", "/report", "/live", "/carrier-of-the-week", "/mars",
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

  // Per-collection detail pages (SEO #29) — statically generated (generateStaticParams)
  const collectionRoutes: MetadataRoute.Sitemap = COLLECTION_SLUGS.map((slug) => ({
    url: `${BASE}/collections/${slug}`,
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

  return [...staticRoutes, ...collectionRoutes, ...vanityRoutes, ...civRoutes, ...tributeRoutes, ...citizenRoutes];
}
