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
      // /regret previously pointed at /numbers; /numbers now folds into
      // /dashboard (see the 2026-05-31 consolidation below), so retarget
      // it to avoid a redirect chain.
      { source: "/regret",       destination: "/dashboard", permanent: true },
      { source: "/rebuild",      destination: "/canon",   permanent: true },
      // 2026-05-27 — /hold-the-line renamed to /synthesis to drop
      // crypto-degen war framing in favor of the Synthesis doctrine.
      // 2026-05-31 — /synthesis itself folded into /earn#synthesis (all
      // hex-earning paths live on one page), so /hold-the-line now points
      // straight at the final home to avoid a double hop. Mechanic unchanged.
      { source: "/hold-the-line", destination: "/earn#synthesis", permanent: true },
      // 2026-05-27 — /lore pruned. Its unique IP (founding/geography +
      // per-civ history/ritual prose) was merged into /canon's expanded
      // origin + civilizations tabs. Anchor sends visitors directly to
      // the merged section. The orphan-from-nav page is gone; the
      // content survives in the canonical reference library.
      { source: "/lore", destination: "/canon#civilizations", permanent: true },

      // ── 2026-05-31 GREAT CONSOLIDATION ──────────────────────────────
      // Founder brief: the site had 52 static pages (~7-10x a comparable
      // NFT-game brand) and felt "too complex". No true duplicates — just
      // feature sprawl. Solution: fold ~28 distinct-but-thin pages into a
      // handful of tabbed hubs (sections with #anchors), then redirect each
      // old route to its new section. Content is preserved (it moved into
      // the hub); the source page.tsx files are left on disk as revert
      // switches, but these redirects own the URLs going forward. Target:
      // ~16 surfaces. 308 (treated as 301 by search engines), no 404s.

      // Holder / wallet cluster → /sync (connect · signal · passport · vault · carrier)
      { source: "/signal",   destination: "/sync#signal",   permanent: true },
      { source: "/passport", destination: "/sync#passport", permanent: true },
      { source: "/vault",    destination: "/sync#vault",    permanent: true },
      { source: "/carrier",  destination: "/sync#carrier",  permanent: true },

      // Stats / market cluster → /dashboard (overview · heat · snipes · civ-war · earners)
      { source: "/numbers",     destination: "/dashboard",          permanent: true },
      { source: "/heat",        destination: "/dashboard#heat",     permanent: true },
      { source: "/undervalued", destination: "/dashboard#snipes",   permanent: true },
      { source: "/civ-wars",    destination: "/dashboard#civ-war",  permanent: true },
      { source: "/leaderboard", destination: "/dashboard#earners",  permanent: true },

      // Lore / reference cluster → /canon (lexicon · names · secrets · roadmap).
      // /the-fifth-bracket intentionally NOT redirected — it stays a hidden
      // easter-egg URL (not in nav, so it costs no newcomer surface).
      { source: "/lexicon", destination: "/canon#lexicon", permanent: true },
      { source: "/names",   destination: "/canon#names",   permanent: true },
      { source: "/secrets", destination: "/canon#secrets", permanent: true },
      { source: "/roadmap", destination: "/canon#roadmap", permanent: true },

      // 2026-06-05 — /manifesto + /origin folded into /canon. Both were deep-lore
      // pages reached only from the canon tabs; the unique IP (the ten verses,
      // the origin prose) now lives inside those tabs (ExtendedManifesto +
      // ExtendedOrigin), so the standalone pages are redundant surface.
      { source: "/manifesto", destination: "/canon#manifesto", permanent: true },
      { source: "/origin",    destination: "/canon#origin",    permanent: true },

      // Visual-taxonomy cluster → /civilizations (civilizations · castes · shapes)
      { source: "/castes", destination: "/civilizations#castes", permanent: true },
      { source: "/shapes", destination: "/civilizations#shapes", permanent: true },

      // Earning cluster → /earn (ledger · relay · synthesis)
      { source: "/relay",     destination: "/earn#relay",     permanent: true },
      { source: "/synthesis", destination: "/earn#synthesis", permanent: true },

      // Social / archive / product folds
      { source: "/patrons",   destination: "/tribute#patrons",   permanent: true },
      { source: "/architect", destination: "/tribute#architect", permanent: true },
      { source: "/graveyard", destination: "/archive#graveyard", permanent: true },
      { source: "/pfp",       destination: "/citizens#pfp",      permanent: true },
      { source: "/daily",     destination: "/play#daily",        permanent: true },
      // 2026-06-03 IA: Combat Archives renamed to the plain "Crypt TCG".
      { source: "/combat-archives", destination: "/crypt-tcg", permanent: true },
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
              // Next.js inlines a hydration script; allow inline + eval for now (tighten later with nonces).
              // Vercel Web Analytics serves its script + event endpoint same-origin
              // (/_vercel/insights/*), so 'self' covers it — no external host needed.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // 2026-05-28: added Google Fonts hosts — Space Mono loads from
              // fonts.googleapis.com (CSS) + fonts.gstatic.com (font files).
              // Without these the link was silently CSP-blocked in prod and
              // mono data fell back to system monospace.
              "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://cdn.fontshare.com https://fonts.googleapis.com",
              "font-src 'self' https://cdn.fontshare.com https://fonts.gstatic.com data:",
              // 2026-05-31: added OpenSea's seadn.io CDN — the Crypt Trading
              // Cards (Combat Archives) relic art is served from *.seadn.io
              // (i2c.seadn.io). Without it the god card images were
              // silently CSP-blocked.
              "img-src 'self' data: blob: https://gateway.pinata.cloud https://ipfs.io https://dweb.link https://*.seadn.io",
              // 2026-06-01: Emile is a video-only collection — its on-chain
              // record is an .mp4 served from raw2.seadn.io. The per-collection
              // explorer renders these in <video>, so the media must be
              // allowlisted or it falls back to default-src and is blocked.
              "media-src 'self' blob: https://*.seadn.io",
              // Client-side ownership checks (useHolder / useOwnsCitizen /
              // WalletConnect) read NEXT_PUBLIC_ETH_RPC_URL (Alchemy) then fall
              // back to a public-RPC chain. 2026-06-07: llamarpc started serving
              // HTML and rpc.ankr.com began requiring an API key — both dead, and
              // both led the fallback list, so real holders intermittently hit
              // "couldn't verify ownership" (Discord, Ddn). Replaced with
              // eth-pokt.nodies.app + eth.rpc.blxrbdn.com (both load-tested
              // healthy) ahead of publicnode + drpc; all allowlisted here.
              "connect-src 'self' https://api.opensea.io https://gateway.pinata.cloud https://cloudflare-eth.com https://eth-mainnet.public.blastapi.io https://eth-mainnet.g.alchemy.com https://eth-pokt.nodies.app https://eth.rpc.blxrbdn.com https://ethereum.publicnode.com https://ethereum-rpc.publicnode.com https://eth.drpc.org https://*.upstash.io https://api.x.com",
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
