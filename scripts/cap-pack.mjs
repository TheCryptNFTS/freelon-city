// Full screenshot pack — every page, desktop + mobile, full-page PNGs.
// Usage: node scripts/cap-pack.mjs [baseURL]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3210";
const OUT = "screenshots";
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
};

// Static routes + a representative instance of each dynamic route.
const ROUTES = [
  "/",
  "/mars-command", "/crypt-tcg", "/demo",
  "/citizens", "/citizens/404", "/citizens/404/card", "/citizens/404/log",
  "/collections", "/collections/the-crypt-official",
  "/civilizations", "/civilizations/blue-synthesis",
  "/archive", "/report", "/canon", "/press", "/developers",
  "/transmissions", "/transmissions/404",
  "/remember", "/proof", "/live",
  "/my-citizens", "/dashboard", "/sync",
  "/help", "/legal", "/legal/terms", "/legal/privacy", "/legal/dmca",
  "/legal/honorary-notice", "/legal/guard-the-pot-rules",
  "/legal/carrier-of-the-week-rules",
  "/play", "/play/sweep", "/play/cipher", "/play/guard", "/play/hex-match",
  "/play/proof", "/play/reckoning", "/play/restore",
  "/earn", "/shop", "/start", "/the-fifth-bracket",
  "/carrier-of-the-week", "/carrier/4040hex", "/channel/4040hex",
  "/tribute", "/tribute/4040hex",
  "/passport/0x0000000000000000000000000000000000000000",
  "/wallet/0x0000000000000000000000000000000000000000",
  "/agent/404", "/agent/c/blue-synthesis/404",
  "/embed/404",
  "/share/quote", "/share/remember", "/share/score",
  "/admin",
];

const slug = (r) => (r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_").replace(/[^a-z0-9_-]/gi, ""));

const manifest = [];

const browser = await chromium.launch();
for (const [vp, cfg] of Object.entries(VIEWPORTS)) {
  const dir = path.join(OUT, vp);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    deviceScaleFactor: cfg.deviceScaleFactor || 1,
    isMobile: !!cfg.isMobile,
    hasTouch: !!cfg.isMobile,
    userAgent: cfg.isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
      : undefined,
  });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    let status = "ERR";
    // 2026-06-30: mobile fullPage shots came out blank WHITE. Cause was
    // `waitUntil:"networkidle"` timing out (HeroVideo + analytics keep
    // connections open) → the catch fell to `domcontentloaded` and screenshotted
    // at 700ms, before the dark shell had painted. Fix: wait for `load` (fires
    // reliably), then for the document body to actually paint its dark bg, then
    // scroll the whole page to trigger lazy/reveal sections, scroll back, settle.
    try {
      const resp = await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 });
      status = resp ? resp.status() : "no-resp";
    } catch {
      try {
        const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
        status = (resp ? resp.status() : "no-resp") + "(dom)";
      } catch {
        status = "TIMEOUT";
      }
    }
    // Wait for first paint of the real (non-white) shell, bounded so error
    // pages that are genuinely light still proceed.
    await page
      .waitForFunction(() => {
        const bg = getComputedStyle(document.body).backgroundColor;
        return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "rgb(255, 255, 255)";
      }, { timeout: 4000 })
      .catch(() => {});
    // Trigger lazy images + IntersectionObserver reveal sections, then return.
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
      window.scrollTo(0, 0);
    }).catch(() => {});
    await page.waitForTimeout(900);
    const file = path.join(dir, `${slug(route)}.png`);
    try {
      await page.screenshot({ path: file, fullPage: true });
    } catch {
      await page.screenshot({ path: file });
    }
    if (vp === "desktop") manifest.push({ route, status });
    process.stdout.write(`${vp} ${route} -> ${status}\n`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();

fs.writeFileSync(path.join(OUT, "MANIFEST.json"), JSON.stringify(manifest, null, 2));
const bad = manifest.filter((m) => String(m.status)[0] !== "2");
console.log(`\nPACK DONE — ${ROUTES.length} routes x 2 viewports`);
console.log(`Non-200: ${bad.length ? bad.map((b) => `${b.route}(${b.status})`).join(", ") : "none"}`);
