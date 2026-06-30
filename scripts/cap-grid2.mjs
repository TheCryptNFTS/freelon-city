import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ width: 1440, height: 900 });
const p = await ctx.newPage();
await p.goto("https://www.freeloncity.com/citizens", { waitUntil: "networkidle", timeout: 60000 }).catch(()=>{});
await p.waitForTimeout(1500);
// force all imgs eager + scroll to trigger any lazy
await p.evaluate(() => { document.querySelectorAll("img").forEach(i => { i.loading = "eager"; }); });
for (let y=0; y<3; y++){ await p.mouse.wheel(0,500); await p.waitForTimeout(500);} 
await p.evaluate(() => window.scrollTo(0,300));
await p.waitForTimeout(2000);
// report img count + how many have natural dimensions (actually loaded)
const stats = await p.evaluate(() => {
  const imgs = [...document.querySelectorAll("img")];
  const loaded = imgs.filter(i => i.naturalWidth > 0).length;
  const srcs = imgs.slice(0,6).map(i => ({src:(i.currentSrc||i.src||"").slice(-60), nw:i.naturalWidth}));
  return { total: imgs.length, loaded, srcs };
});
console.log(JSON.stringify(stats, null, 2));
await p.screenshot({ path: "screenshots/focus/desktop-citizens-crop2.png", clip: { x: 0, y: 280, width: 1440, height: 620 } });
await b.close();
