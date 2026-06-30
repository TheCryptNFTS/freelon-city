import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ width: 1440, height: 900 });
const p = await ctx.newPage();
await p.goto("https://www.freeloncity.com/citizens", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(2000);
for (let y=0; y<3; y++){ await p.mouse.wheel(0,500); await p.waitForTimeout(600);} 
await p.evaluate(() => window.scrollTo(0,300));
await p.waitForTimeout(3000);
const stats = await p.evaluate(() => {
  const imgs = [...document.querySelectorAll(".results-grid img, .ones-grid img, .honor-grid img")];
  return { gridImgs: imgs.length, loaded: imgs.filter(i=>i.naturalWidth>0).length };
});
console.log("BEFORE FIX: 1/112 loaded");
console.log("AFTER FIX :", JSON.stringify(stats));
await p.screenshot({ path: "screenshots/focus/desktop-citizens-fixed.png", clip: { x: 0, y: 280, width: 1440, height: 620 } });
await b.close();
