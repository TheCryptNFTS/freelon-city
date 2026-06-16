import type { MetadataRoute } from "next";

/**
 * PWA web app manifest (2026-06-16). Makes FREELON CITY installable to the phone
 * home screen as a standalone, app-like experience — no browser chrome, brand
 * splash, warm-black theme. Served at /manifest.webmanifest and linked from the
 * metadata `manifest` field in layout.tsx. Icons generated from public/logo.png.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FREELON CITY",
    short_name: "FREELON",
    description:
      "A living on-chain AI civilization. Meet a citizen free, own a FREELON, train it, and battle in the city's card arena.",
    start_url: "/?utm_source=pwa",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0a09",
    theme_color: "#0b0a09",
    categories: ["games", "entertainment", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "The City — live now", short_name: "Live", url: "/live" },
      { name: "Meet a citizen (free)", short_name: "Demo", url: "/demo" },
      { name: "Play the games", short_name: "Play", url: "/play" },
    ],
  };
}
