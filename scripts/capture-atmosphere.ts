import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5190;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/atmosphere');
const VIEW_COUNT = 20;
const LOAD_MS = 16_000;
const SETTLE_MS = 2500;

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Atmosphere capture dev server did not start');
}

async function cycle(page: Page, key: string, count: number) {
  for (let index = 0; index < count; index += 1) { await page.keyboard.press(key); await page.waitForTimeout(120); }
}

async function shot(page: Page, filename: string) {
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 30_000 });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' });
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (error) => console.error(`[browser pageerror] ${error.stack ?? error.message}`));
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(LOAD_MS);
    await page.keyboard.press('KeyV');
    let view = 0;
    const go = async (target: number) => { await cycle(page, 'KeyM', (target - view + VIEW_COUNT) % VIEW_COUNT); view = target; };

    await go(0); await shot(page, 'atmosphere-entrance.png');
    await go(1); await shot(page, 'atmosphere-central-axis.png');
    await go(11); await shot(page, 'atmosphere-aerial-perspective.png');
    await go(13); await shot(page, 'atmosphere-garden-wind.png');
    await go(15); await shot(page, 'atmosphere-tree-canopy.png');

    await page.keyboard.press('KeyP');
    await go(1); await shot(page, 'atmosphere-neutral-reference.png');
    await page.keyboard.press('KeyP'); await shot(page, 'atmosphere-final-sunset.png');
    await page.keyboard.press('KeyP');

    await page.keyboard.press('KeyI');
    await page.getByRole('slider', { name: 'Haze scale' }).fill('0');
    await page.getByRole('checkbox', { name: 'Particles' }).uncheck();
    await page.getByRole('checkbox', { name: 'Wind' }).uncheck();
    await shot(page, 'atmosphere-effects-off.png');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await shot(page, 'atmosphere-effects-on.png');
    await page.getByRole('checkbox', { name: 'Diagnostic visibility' }).check();
    await shot(page, 'atmosphere-particle-diagnostic.png');
    await page.getByRole('checkbox', { name: 'Diagnostic visibility' }).uncheck();
    await page.getByRole('slider', { name: 'Wind amplitude' }).fill('0.12');
    await shot(page, 'atmosphere-wind-diagnostic.png');
    await page.keyboard.press('KeyI');

    await cycle(page, 'KeyT', 1); await shot(page, 'atmosphere-desktop-high.png');
    await cycle(page, 'KeyT', 1); await shot(page, 'atmosphere-desktop-medium.png');
    await page.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await mobilePage.waitForTimeout(LOAD_MS);
    await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, 'atmosphere-mobile-low.png'), timeout: 30_000 });
    await mobile.close();
    console.log(`Generated 14 atmosphere captures in ${OUTPUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
