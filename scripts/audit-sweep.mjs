import { chromium, devices } from "playwright";
import fs from "node:fs";
const BASE = "https://www.freeloncity.com";
const OUT = "screenshots/audit";
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ["/", "/citizens", "/remember", "/demo", "/dashboard", "/crypt-tcg",
  "/mars-command", "/collections", "/tribute", "/my-citizens", "/proof", "/live",
  "/earn", "/play", "/sync", "/report", "/civilizations", "/archive"];
const report = {};
const browser = await chromium.launch();
for (const mode of ["desktop", "mobile"]) {
  const ctx = await browser.newContext(mode === "mobile"
    ? { ...devices["iPhone 13"] }
    : { viewport: { width: 1440, height: 900 } });
  for (const r of ROUTES) {
    const key = `${mode}${r}`;
    const consoleErr = [], failed = [], pageErr = [];
    const page = await ctx.newPage();
    page.on("console", m => { if (m.type() === "error") consoleErr.push(m.text().slice(0,160)); });
    page.on("pageerror", e => pageErr.push((e.message||"").slice(0,160)));
    page.on("requestfailed", rq => { const u=rq.url(); if(!/analytics|beacon|favicon/.test(u)) failed.push(rq.resourceType()+" "+u.slice(0,90)+" :: "+(rq.failure()?.errorText||"")); });
    let status = 0, t0 = Date.now();
    try {
      const resp = await page.goto(BASE + r, { waitUntil: "load", timeout: 45000 });
      status = resp ? resp.status() : 0;
      await page.waitForTimeout(1200);
      for (let y=0;y<3;y++){ await page.mouse.wheel(0,800); await page.waitForTimeout(300);} 
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.waitForTimeout(800);
    } catch(e){ pageErr.push("NAV: "+e.message.split("\n")[0]); }
    const imgs = await page.evaluate(() => {
      const a = [...document.querySelectorAll("img")];
      return { total: a.length, broken: a.filter(i=>i.complete && i.naturalWidth===0).length };
    }).catch(()=>({total:-1,broken:-1}));
    const loadMs = Date.now()-t0;
    const slug = r==="/"?"home":r.replace(/\//g,"_").replace(/^_/,"");
    // tight above-fold crop (readable)
    const vp = mode==="mobile"?{w:390,h:844}:{w:1440,h:900};
    try { await page.screenshot({ path: `${OUT}/${mode}-${slug}.png`, clip:{x:0,y:0,width:vp.w,height:vp.h} }); } catch {}
    report[key] = { status, loadMs, imgs, consoleErr: consoleErr.slice(0,5), pageErr: pageErr.slice(0,5), failed: failed.slice(0,6) };
    await page.close();
    process.stdout.write(`${status} ${mode} ${r} (${loadMs}ms img:${imgs.broken}/${imgs.total} err:${consoleErr.length+pageErr.length} fail:${failed.length})\n`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report,null,2));
console.log("\nWROTE "+OUT+"/report.json");
