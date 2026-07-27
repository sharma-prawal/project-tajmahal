import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5191;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/ambient-life');
const VIEW_COUNT = 20;
const LOAD_MS = 16_000;
const SETTLE_MS = 2200;

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Ambient capture dev server did not start');
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

    await go(0); await shot(page, 'ambient-entrance.png');
    await go(1); await shot(page, 'ambient-central-axis.png');
    await go(11); await shot(page, 'ambient-wide-aerial.png');
    await go(13); await shot(page, 'ambient-ground-walking.png');

    await page.keyboard.press('KeyO');
    await page.getByRole('checkbox', { name: /Debug visualization/ }).check();
    await page.getByRole('slider', { name: 'Ambient spawn density' }).fill('1');
    await page.getByRole('slider', { name: 'Ambient opacity' }).fill('1');
    const family = (name: string) => page.getByRole('checkbox', { name: new RegExp(`^${name}`) });
    const only = async (name: string) => {
      for (const candidate of ['Birds', 'Butterflies', 'Petals', 'Leaves', 'Mist']) {
        if (candidate === name) await family(candidate).check(); else await family(candidate).uncheck();
      }
    };
    await only('Birds');
    await go(1); await shot(page, 'ambient-bird-flyover.png');
    await only('Butterflies');
    await go(14); await shot(page, 'ambient-butterfly-close.png');
    await only('Petals');
    await go(13); await shot(page, 'ambient-petals.png');
    await only('Leaves');
    await shot(page, 'ambient-leaves.png');
    await only('Mist');
    await go(18); await shot(page, 'ambient-fountain-mist.png');
    for (const name of ['Birds', 'Butterflies', 'Petals', 'Leaves', 'Mist']) await family(name).check();
    await go(1); await shot(page, 'ambient-diagnostic.png');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.keyboard.press('KeyO');
    await shot(page, 'ambient-performance-overlay.png');

    await cycle(page, 'KeyT', 1); await shot(page, 'ambient-quality-high.png');
    await cycle(page, 'KeyT', 1); await shot(page, 'ambient-quality-medium.png');
    await cycle(page, 'KeyT', 2); await shot(page, 'ambient-quality-mobile-low.png');
    await page.getByRole('button', { name: 'Open settings and controls' }).click();
    await page.getByRole('checkbox', { name: 'Reduced motion' }).check();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.keyboard.press('KeyO');
    await shot(page, 'ambient-reduced-motion.png');
    console.log(`Generated 15 ambient-life captures in ${OUTPUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
