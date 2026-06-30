import { chromium } from "playwright";
const url = process.argv[2] || "https://www.freeloncity.com/";
const b = await chromium.launch();

for (const [name, vp] of [["desktop",{width:1440,height:900}],["mobile",{width:390,height:844,isMobile:true,deviceScaleFactor:2}]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: !!vp.isMobile, hasTouch: !!vp.isMobile,
    userAgent: vp.isMobile ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" : undefined });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await p.waitForTimeout(1500);
  // scroll through to trigger lazy/reveal sections
  await p.evaluate(async () => { for (let y=0; y<document.body.scrollHeight; y+=600){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,120)); } window.scrollTo(0,0); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `screenshots/LIVE-home-${name}.png`, fullPage: true });
  // dump the section order so I can SEE what's actually on the page
  const sections = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll("main > *, main section, section").forEach(el => {
      const cls = (el.className||"").toString().slice(0,60);
      const tag = el.tagName.toLowerCase();
      const txt = (el.textContent||"").trim().replace(/\s+/g," ").slice(0,70);
      const h = el.getBoundingClientRect().height|0;
      if (h>40) out.push(`${tag}.${cls} [${h}px] :: ${txt}`);
    });
    return out;
  });
  const full = await p.evaluate(()=>document.body.scrollHeight);
  console.log(`\n===== ${name} (full page height ${full}px) =====`);
  sections.forEach((s,i)=>console.log(`${i+1}. ${s}`));
  await ctx.close();
}
await b.close();
