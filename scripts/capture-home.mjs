import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/Users/billy/freelon/phase3/freelon-city-site/screenshots/launcher";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const browser = await chromium.launch();

async function shoot(label, viewport, { path = "/", scrollTo = null, full = false, wait = 1200 } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
  if (scrollTo != null) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await page.waitForTimeout(500);
  }
  const out = `${OUT}/${label}.png`;
  await page.screenshot({ path: out, fullPage: full });
  await ctx.close();
  return out;
}

async function shootElement(label, viewport, selector) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const el = page.locator(selector);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const out = `${OUT}/${label}.png`;
  await el.screenshot({ path: out });
  await ctx.close();
  return out;
}

async function shootMobileMenu(label, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator(".mobile-trigger").click();
  await page.waitForTimeout(500);
  const out = `${OUT}/${label}.png`;
  await page.screenshot({ path: out });
  await ctx.close();
  return out;
}

const results = {};
// Desktop
results["desktop-hero"] = await shoot("desktop-hero", { width: 1440, height: 900 }, { scrollTo: 0 });
results["desktop-first-screen"] = await shoot("desktop-first-screen", { width: 1440, height: 900 }, { scrollTo: 0 });
results["desktop-cards"] = await shootElement("desktop-cards", { width: 1440, height: 900 }, ".product-doors");
// Mobile 390
results["mobile-hero"] = await shoot("mobile-hero", { width: 390, height: 844 }, { scrollTo: 0 });
results["mobile-cards"] = await shootElement("mobile-cards", { width: 390, height: 844 }, ".product-doors");
results["mobile-menu"] = await shootMobileMenu("mobile-menu", { width: 390, height: 844 });
// Mobile 430 (large phone)
results["mobile430-hero"] = await shoot("mobile430-hero", { width: 430, height: 932 }, { scrollTo: 0 });
// Tablet
results["tablet-first-screen"] = await shoot("tablet-first-screen", { width: 844, height: 1180 }, { scrollTo: 0 });
// /play
results["play"] = await shoot("play", { width: 1440, height: 900 }, { path: "/play", scrollTo: 0 });
results["play-mobile"] = await shoot("play-mobile", { width: 390, height: 844 }, { path: "/play", scrollTo: 0 });

await browser.close();
console.log(JSON.stringify(results, null, 2));
