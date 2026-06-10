#!/usr/bin/env node
// Screenshot harness — gives the repo eyes.
//
//   npm run shots             -> builds if no prod build exists, boots `next start`
//                                on :4500, captures 12 full-page PNGs into screenshots/
//   FORCE_BUILD=1 npm run shots  -> always rebuild first
//
// Rules honored here (see CLAUDE.md):
//   - NEVER uses the dev server. Prod build + `next start` only.
//   - Never builds while a server is using .next — port 4500 is killed first.

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4500;
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT, "screenshots");
const SETTLE_MS = 2500; // extra settle after network idle so slow first paint isn't blank
const ROUTES = [
  { route: "/", name: "home" },
  { route: "/start", name: "start" },
  { route: "/demo", name: "demo" },
  { route: "/citizens", name: "citizens" },
  { route: "/collections", name: "collections" },
  { route: "/crypt-tcg", name: "crypt-tcg" },
];
const VIEWPORTS = [
  { width: 390, height: 844 }, // mobile
  { width: 1440, height: 900 }, // desktop
];

function killPort(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill 2>/dev/null`, { stdio: "ignore", shell: "/bin/bash" });
  } catch {
    /* nothing on the port */
  }
}

function buildIfNeeded() {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  if (existsSync(buildId) && !process.env.FORCE_BUILD) {
    console.log("[shots] existing prod build found (.next/BUILD_ID) — skipping build (FORCE_BUILD=1 to rebuild)");
    return;
  }
  console.log("[shots] no prod build found — running `npm run build` ...");
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
}

function startServer() {
  console.log(`[shots] starting \`next start\` on :${PORT} ...`);
  const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  child.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  return child;
}

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server on :${PORT} did not come up within ${timeoutMs}ms`);
}

async function main() {
  killPort(PORT);
  buildIfNeeded();
  mkdirSync(OUT_DIR, { recursive: true });

  const server = startServer();
  let failures = 0;

  try {
    await waitForServer();
    const browser = await chromium.launch();
    try {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
        const page = await context.newPage();
        for (const { route, name } of ROUTES) {
          const file = path.join(OUT_DIR, `${name}-${vp.width}.png`);
          try {
            await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
          } catch (err) {
            // networkidle can time out on pages with long-polling — still capture
            console.warn(`[shots] ${route} @${vp.width}: networkidle wait incomplete (${err.message.split("\n")[0]}) — capturing anyway`);
          }
          await page.waitForTimeout(SETTLE_MS);
          await page.screenshot({ path: file, fullPage: true });
          const kb = statSync(file).size / 1024;
          const blank = kb < 20;
          if (blank) failures++;
          console.log(`[shots] ${blank ? "WARN (suspiciously small — blank?)" : "ok"}  ${path.relative(ROOT, file)}  ${kb.toFixed(1)}KB`);
        }
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill("SIGTERM");
    killPort(PORT); // belt and suspenders
  }

  console.log(`[shots] done — ${ROUTES.length * VIEWPORTS.length} screenshots in ${path.relative(ROOT, OUT_DIR)}/`);
  if (failures > 0) {
    console.error(`[shots] ${failures} screenshot(s) under 20KB — likely blank. Failing.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[shots] FAILED:", err);
  killPort(PORT);
  process.exit(1);
});
