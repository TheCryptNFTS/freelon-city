import { chromium } from "playwright";
const b = await chromium.launch();
// desktop citizens grid crop
const ctx = await b.newContext({ width: 1440, height: 900 });
const p = await ctx.newPage();
await p.goto("https://www.freeloncity.com/citizens", { waitUntil: "load", timeout: 45000 });
await p.waitForTimeout(2000);
await p.evaluate(() => window.scrollTo(0, 600));
await p.waitForTimeout(800);
await p.screenshot({ path: "screenshots/focus/desktop-citizens-crop.png", clip: { x: 0, y: 0, width: 1440, height: 760 } });
console.log("desktop grid crop done");
await b.close();
