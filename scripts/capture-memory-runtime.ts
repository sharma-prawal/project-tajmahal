import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const PORT = 5194; const BASE_URL = `http://localhost:${PORT}`; const OUTPUT_DIR = path.resolve('artifacts/review/memory-runtime');
async function waitForServer() { const start = Date.now(); while (Date.now() - start < 30_000) { try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 300)); } throw new Error('Memory capture server did not start'); }
async function spawnAt(page: Page) { await page.goto(`${BASE_URL}?spawn=18,2,-53`, { waitUntil: 'networkidle', timeout: 60_000 }); await page.waitForSelector('canvas'); await page.waitForTimeout(4500); }
async function shot(page: Page, name: string, settle = 350) { await page.waitForTimeout(settle); await page.screenshot({ path: path.join(OUTPUT_DIR, name), timeout: 30_000 }); }
const prompt = (page: Page) => page.getByRole('button', { name: /placeholder architectural memory/i });
const dialogue = (page: Page) => page.getByRole('dialog', { name: 'Memory dialogue' });
async function acknowledge(page: Page) { await page.evaluate(() => (window as unknown as { __memoryRuntime?: { acknowledge: () => boolean } }).__memoryRuntime?.acknowledge()); }
async function activate(page: Page) { await prompt(page).waitFor(); await page.keyboard.press('KeyE'); await dialogue(page).waitFor(); }

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true }); let server: ChildProcess | undefined; let browser: Browser | undefined; const errors: string[] = [];
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' }); await waitForServer();
    browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await spawnAt(page); await page.evaluate(() => localStorage.removeItem('project-taj:save')); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4500);
    await prompt(page).waitFor(); await shot(page, 'memory-01-eligible-prompt.png'); await page.keyboard.press('KeyE'); await dialogue(page).waitFor();
    await shot(page, 'memory-02-activation.png'); await shot(page, 'memory-03-first-dialogue.png');
    await acknowledge(page); await shot(page, 'memory-04-camera-owned.png', 120); await page.waitForTimeout(1100); await dialogue(page).waitFor();
    await shot(page, 'memory-05-world-action.png');
    await page.keyboard.press('KeyH'); await shot(page, 'memory-06-checkpoint-diagnostics.png'); await page.keyboard.press('Escape'); await shot(page, 'memory-07-cancellation.png'); await page.keyboard.press('KeyH');
    await page.waitForTimeout(900); await activate(page); await acknowledge(page); await page.waitForTimeout(1100); await dialogue(page).waitFor(); await acknowledge(page); await page.waitForTimeout(500);
    await shot(page, 'memory-08-completed.png'); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4500); await page.keyboard.press('KeyH'); await shot(page, 'memory-09-restored-completed.png'); await page.keyboard.press('KeyH');
    await page.evaluate(() => (window as unknown as { __memoryCaptureReset?: (reduced: boolean) => void }).__memoryCaptureReset?.(true)); await page.waitForTimeout(800); await activate(page); await acknowledge(page); await shot(page, 'memory-10-reduced-motion.png', 100);

    const mobileContext: BrowserContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mobile = await mobileContext.newPage(); mobile.on('pageerror', (error) => errors.push(`[mobile] ${error.stack ?? error.message}`)); await mobile.addInitScript(() => localStorage.removeItem('project-taj:save')); await spawnAt(mobile); await prompt(mobile).click(); await dialogue(mobile).waitFor();
    const box = await dialogue(mobile).getByRole('button').boundingBox(); if (!box || box.height < 44) throw new Error(`Mobile acknowledgement target is ${box?.height ?? 0}px`);
    await shot(mobile, 'memory-11-mobile-emulated-dialogue.png'); await mobileContext.close();

    await page.keyboard.press('Escape'); await page.waitForTimeout(800); await page.keyboard.press('KeyH'); await shot(page, 'memory-12-runtime-diagnostics.png'); await shot(page, 'memory-13-performance-overlay.png');
    if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`);
    console.log(`Generated and browser-validated 13 memory runtime captures in ${OUTPUT_DIR}`);
  } finally { if (browser) await browser.close(); if (server) server.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
