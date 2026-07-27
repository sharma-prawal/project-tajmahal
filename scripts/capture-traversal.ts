import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5192;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/traversal');

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Traversal capture dev server did not start');
}

async function shot(page: Page, filename: string, settle = 1800) {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 30_000 });
}

async function checkpoint(page: Page, x: number, y: number, z: number) {
  await page.goto(`${BASE_URL}?spawn=${x},${y},${z}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(4500);
}

async function walk(page: Page, key: string, milliseconds: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
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
    await page.waitForTimeout(14_000);

    await walk(page, 'KeyW', 1800); await shot(page, 'traversal-entrance-walk.png');
    await checkpoint(page, 3.2, 2, -55); await walk(page, 'KeyW', 1500); await shot(page, 'traversal-central-axis-approach.png');
    await checkpoint(page, 2.8, 2, -53); await walk(page, 'KeyA', 900); await shot(page, 'traversal-fountain.png');
    await checkpoint(page, -24, 2, -78); await walk(page, 'KeyW', 1200); await shot(page, 'traversal-side-garden.png');

    await checkpoint(page, 18, 5, -158);
    await page.locator('#root canvas').click({ position: { x: 700, y: 400 } });
    await page.mouse.move(930, 400, { steps: 12 });
    await shot(page, 'traversal-taj-orbit.png');

    await checkpoint(page, -20, 2, -92); await walk(page, 'KeyD', 900); await shot(page, 'traversal-narrow-path.png');
    await checkpoint(page, 0, 2, -30); await shot(page, 'traversal-camera-clipping.png');

    await page.keyboard.press('KeyL');
    await page.getByRole('checkbox', { name: 'Collision debug' }).check();
    await shot(page, 'traversal-collision-validation.png');
    await page.getByRole('checkbox', { name: 'Path visualization' }).check();
    await shot(page, 'traversal-diagnostics-overlay.png');
    await page.getByRole('checkbox', { name: 'Reduced motion simulation' }).check();
    await page.getByRole('checkbox', { name: 'Collision debug' }).uncheck();
    await shot(page, 'traversal-accessibility-mode.png');

    console.log(`Generated 10 traversal captures in ${OUTPUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
