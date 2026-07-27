import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5189;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/water');
const VIEW_COUNT = 20;
const LOAD_MS = 16_000;
const SETTLE_MS = 2500;

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Water capture dev server did not start');
}

async function cycle(page: Page, key: string, count: number) {
  for (let i = 0; i < count; i += 1) { await page.keyboard.press(key); await page.waitForTimeout(120); }
}

async function capture(page: Page, filename: string) {
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 30_000 });
}

async function setWaterMode(page: Page, mode: 'auto' | 'planar' | 'environment') {
  await page.selectOption('select', mode);
  await page.waitForTimeout(500);
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
    page.on('pageerror', (error) => console.error(`[browser pageerror] ${error.message}`));
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(LOAD_MS);
    await page.keyboard.press('KeyV');

    let view = 0;
    const go = async (target: number) => { await cycle(page, 'KeyM', (target - view + VIEW_COUNT) % VIEW_COUNT); view = target; };
    await go(0); await capture(page, 'water-entrance-reflection.png');
    await go(1); await capture(page, 'water-central-axis.png');
    await go(2); await capture(page, 'water-reflecting-pool.png');
    await go(17); await capture(page, 'water-low-angle.png');
    await go(18); await capture(page, 'water-fountain-close-up.png');

    await page.keyboard.press('KeyU');
    await go(19);
    await setWaterMode(page, 'planar'); await capture(page, 'water-reflection-planar.png');
    await setWaterMode(page, 'environment'); await capture(page, 'water-reflection-environment.png');
    await setWaterMode(page, 'auto');
    await page.locator('label').filter({ hasText: 'Wave amplitude' }).locator('input').fill('0');
    await capture(page, 'water-ripple-flat.png');
    await page.locator('label').filter({ hasText: 'Wave amplitude' }).locator('input').fill('0.035');
    await capture(page, 'water-ripple-gentle.png');
    await page.getByLabel('Animation paused').check(); await capture(page, 'water-static.png');
    await page.getByLabel('Animation paused').uncheck(); await capture(page, 'water-animated.png');
    await capture(page, 'water-shader-diagnostic.png');
    await page.keyboard.press('KeyU');

    await cycle(page, 'KeyT', 1); await capture(page, 'water-desktop-quality.png');
    await cycle(page, 'KeyT', 1); await capture(page, 'water-medium-quality.png');
    await page.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await mobilePage.waitForTimeout(LOAD_MS);
    await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, 'water-mobile-quality.png'), timeout: 30_000 });
    await mobile.close();

    console.log(`Generated 15 water captures in ${OUTPUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
