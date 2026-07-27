import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5210; const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/environment-premium');
const VIEWS = [
  { index: 0, name: '01-entrance-gateway.png' },
  { index: 1, name: '02-long-central-approach.png' },
  { index: 2, name: '03-reflecting-pool-axis.png' },
  { index: 3, name: '04-taj-approach.png' },
  { index: 4, name: '05-taj-three-quarter.png' },
  { index: 5, name: '06-taj-low-angle.png' },
  { index: 8, name: '07-garden-cross-axis.png' },
  { index: 11, name: '08-elevated-garden-overview.png' },
  { index: 17, name: '09-water-low-angle.png' },
] as const;

const problems: string[] = [];

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Environment capture server did not start within 90s');
}

/**
 * Load robustly. `networkidle` never settles for this app (persistent dev
 * connection), so we wait on the canvas element + a settle delay instead, and
 * assert the canvas is actually present after warm-up — a crashed canvas
 * (CanvasErrorBoundary) is reported loudly rather than silently producing a
 * stale/blank capture.
 */
async function load(page: Page, label: string) {
  await page.addInitScript(() => {
    localStorage.removeItem('project-taj:save');
    localStorage.removeItem('project-taj:experience-settings');
  });
  await page.goto(`${BASE_URL}?cleanCapture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('#root canvas', { timeout: 60_000 });
  await page.waitForTimeout(9000);
  const canvasAlive = await page.locator('#root canvas').count();
  if (canvasAlive < 1) problems.push(`[${label}] canvas missing after warm-up (likely CanvasErrorBoundary / WebGL context loss)`);
}

/** Hide only the UI overlays — never the canvas or its ancestors — then take a
 *  full-viewport screenshot (immune to the canvas locator vanishing mid-run). */
async function shot(page: Page, filename: string, label: string) {
  await page.waitForTimeout(1200);
  const canvasAlive = await page.locator('#root canvas').count();
  if (canvasAlive < 1) { problems.push(`[${label}] ${filename}: canvas absent at capture time — scene crashed`); }
  await page.evaluate(() => {
    const root = document.querySelector('#root');
    root?.querySelectorAll<HTMLElement>(':scope > *').forEach((el) => {
      if (el.tagName !== 'CANVAS' && !el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
    document.querySelectorAll<HTMLElement>('.experience-hud, .camera-controls, #stats').forEach((el) => { el.style.visibility = 'hidden'; });
  });
  // SwiftShader can take a long time to composite the heaviest wide frames — a
  // generous timeout so those views capture rather than silently dropping.
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 120_000 });
  // restore overlays for subsequent view switches
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('#root > *, .experience-hud, .camera-controls, #stats').forEach((el) => { el.style.visibility = ''; });
  });
}

/**
 * Steps the debug camera forward one view at a time.
 *
 * The presses used to fire in a tight loop with a single settle at the end.
 * Under SwiftShader a frame can take seconds, and dropped keypresses shift
 * every subsequent view silently — a capture set that looks fine and shows the
 * wrong cameras, which is the same class of failure as the stale-capture bug.
 * A pause between presses costs a few seconds per run and removes it.
 */
async function selectView(page: Page, current: number, target: number) {
  for (let index = current; index < target; index += 1) {
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);
  return target;
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true }); let server: ChildProcess | undefined; let browser: Browser | undefined;
  try {
    server = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' }); await waitForServer(); browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (error) => problems.push(`[desktop] pageerror: ${error.message.split('\n')[0]}`));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('DevTools')) problems.push(`[desktop] console: ${m.text().split('\n')[0]}`); });
    await load(page, 'desktop'); await page.keyboard.press('KeyV'); await page.waitForTimeout(500); let current = 0;
    for (const view of VIEWS) {
      current = await selectView(page, current, view.index);
      try { await shot(page, view.name, 'desktop'); } catch (e) { problems.push(`[desktop] ${view.name}: ${(e as Error).message.split('\n')[0]}`); }
    }
    await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV');
    for (let index = 0; index < 3; index += 1) await page.keyboard.press('KeyM');
    await page.keyboard.press('KeyP'); await page.keyboard.press('KeyP');
    try { await shot(page, '10-sunset-lighting.png', 'desktop'); } catch (e) { problems.push(`[desktop] 10-sunset: ${(e as Error).message.split('\n')[0]}`); }
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const mobile = await mobileContext.newPage(); mobile.on('pageerror', (error) => problems.push(`[mobile] pageerror: ${error.message.split('\n')[0]}`)); await load(mobile, 'mobile'); await mobile.keyboard.press('KeyV'); await mobile.keyboard.press('KeyM');
    try { await shot(mobile, '11-mobile-central-axis.png', 'mobile'); } catch (e) { problems.push(`[mobile] 11: ${(e as Error).message.split('\n')[0]}`); }
    await mobileContext.close();
    await writeFile(path.join(OUTPUT_DIR, 'capture-validation.json'), `${JSON.stringify({ measuredAt: new Date().toISOString(), environment: 'Playwright Chromium / SwiftShader; not physical-device validation', captures: [...VIEWS.map((view) => view.name), '10-sunset-lighting.png', '11-mobile-central-axis.png'], problems }, null, 2)}\n`);
    if (problems.length) { console.warn(`Captured with ${problems.length} problem(s):\n  ${problems.join('\n  ')}`); }
    console.log(`Generated ${VIEWS.length + 2} premium environment captures in ${OUTPUT_DIR}${problems.length ? ' (see problems above)' : ' — clean'}`);
  } finally { if (browser) await browser.close(); if (server) server.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
