import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "https://www.freeloncity.com";
const OUT = "screenshots/focus";
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ["/", "/citizens", "/remember", "/demo", "/crypt-tcg", "/mars-command", "/dashboard"];
const VPS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
};
const browser = await chromium.launch();
for (const [name, vp] of Object.entries(VPS)) {
  const ctx = await browser.newContext(vp);
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    const slug = r === "/" ? "home" : r.replace(/\//g, "_").replace(/^_/, "");
    try {
      await page.goto(BASE + r, { waitUntil: "load", timeout: 45000 });
      await page.waitForFunction(() => {
        const b = getComputedStyle(document.body).backgroundColor;
        return b && b !== "rgba(0, 0, 0, 0)" && b !== "rgb(255, 255, 255)";
      }, { timeout: 4000 }).catch(() => {});
      for (let y = 0; y < 4; y++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(180); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(900);
      const f = `${OUT}/${name}-${slug}.png`;
      await page.screenshot({ path: f, fullPage: true });
      const kb = (fs.statSync(f).size / 1024).toFixed(0);
      console.log(`OK  ${name} ${r} -> ${kb}KB`);
    } catch (e) { console.log(`ERR ${name} ${r}: ${e.message.split("\n")[0]}`); }
  }
  await ctx.close();
}
await browser.close();
