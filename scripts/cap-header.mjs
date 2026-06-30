import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
const p = await ctx.newPage();
await p.goto("https://www.freeloncity.com/", { waitUntil: "load", timeout: 45000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: "screenshots/focus/mobile-header-crop.png", clip: { x: 0, y: 0, width: 390, height: 90 } });
console.log("done");
await b.close();
