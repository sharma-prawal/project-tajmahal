import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5193;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/interaction');

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Interaction capture server did not start');
}

async function spawnAt(page: Page, z: number, x = 18) {
  await page.goto(`${BASE_URL}?spawn=${x},2,${z}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(4200);
}

async function shot(page: Page, name: string, settle = 450) {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(OUTPUT_DIR, name), timeout: 30_000 });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  const pageErrors: string[] = [];
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' });
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));

    await spawnAt(page, -36);
    await page.evaluate(() => localStorage.removeItem('project-taj:save'));
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4200);
    await shot(page, 'interaction-01-outside-range.png');

    await spawnAt(page, -42);
    await page.getByRole('button', { name: /garden validation marker/i }).waitFor();
    await shot(page, 'interaction-02-entering-range.png');

    await spawnAt(page, -53, 10);
    await page.getByRole('button', { name: /architectural validation marker/i }).waitFor();
    await page.keyboard.press('KeyJ');
    await shot(page, 'interaction-03-focus-angle.png');
    await page.keyboard.press('KeyJ');
    await shot(page, 'interaction-04-multiple-candidate-priority.png');

    await spawnAt(page, -65);
    await page.getByRole('button', { name: /persisted interaction validation marker/i }).waitFor();
    await page.keyboard.press('KeyE');
    await shot(page, 'interaction-05-one-shot-completion.png');

    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4200);
    await page.keyboard.press('KeyJ');
    await shot(page, 'interaction-06-completed-after-restore.png');
    await page.keyboard.press('KeyJ');

    await spawnAt(page, -77);
    const repeatPrompt = page.getByRole('button', { name: /repeatable interaction validation marker/i });
    await repeatPrompt.waitFor(); await page.keyboard.press('KeyE'); await page.waitForTimeout(800); await repeatPrompt.waitFor();
    await shot(page, 'interaction-07-repeatable.png');

    await page.keyboard.press('KeyJ');
    await page.getByRole('checkbox', { name: 'High-contrast prompts' }).check();
    await shot(page, 'interaction-08-accessibility-prompt.png');
    await page.getByRole('checkbox', { name: /Trigger bounds/ }).check();
    await page.getByRole('checkbox', { name: /Focus-angle guides/ }).check();
    await shot(page, 'interaction-09-debug-trigger-visualization.png');
    await shot(page, 'interaction-10-diagnostics-overlay.png');

    if (pageErrors.length) throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);
    console.log(`Generated and browser-validated 10 interaction captures in ${OUTPUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
