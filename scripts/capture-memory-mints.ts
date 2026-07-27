import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5195; const BASE_URL = `http://localhost:${PORT}`; const OUTPUT_DIR = path.resolve('artifacts/review/memory-mints');
async function waitForServer() { const start = Date.now(); while (Date.now() - start < 30_000) { try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 300)); } throw new Error('Mints capture server did not start'); }
async function spawnAt(page: Page, z: number) { await page.goto(`${BASE_URL}?spawn=-22,2,${z}`, { waitUntil: 'networkidle', timeout: 60_000 }); await page.waitForSelector('canvas'); await page.waitForTimeout(4500); }
async function shot(page: Page, name: string, settle = 350) { await page.waitForTimeout(settle); await page.screenshot({ path: path.join(OUTPUT_DIR, name), timeout: 30_000 }); }
const prompt = (page: Page) => page.getByRole('button', { name: 'Remember The Mints' });
const dialogue = (page: Page) => page.getByRole('dialog', { name: 'Memory narration' });
async function activate(page: Page) { await prompt(page).waitFor(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1200); await dialogue(page).waitFor(); }
async function reset(page: Page, reduced = false) { await page.evaluate((value) => (window as unknown as { __mintsCaptureReset?: (reduced: boolean) => void }).__mintsCaptureReset?.(value), reduced); await page.waitForTimeout(700); }

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true }); let server: ChildProcess | undefined; let browser: Browser | undefined; const errors: string[] = [];
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' }); await waitForServer(); browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await spawnAt(page, -57.5); await page.evaluate(() => localStorage.removeItem('project-taj:save')); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4500); await shot(page, 'mints-01-environmental-discovery.png');
    await spawnAt(page, -60.5); await prompt(page).waitFor(); await shot(page, 'mints-02-eligible-prompt.png'); await page.keyboard.press('KeyE'); await shot(page, 'mints-03-activation-transition.png', 180); await shot(page, 'mints-05-camera-owned-composition.png', 350); await page.waitForTimeout(900); await dialogue(page).waitFor();
    await shot(page, 'mints-04-friend-offer-declined.png'); await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await shot(page, 'mints-06-world-action.png'); await shot(page, 'mints-07-narrator-offer-accepted.png');
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(5000); await dialogue(page).waitFor(); await shot(page, 'mints-16-restored-checkpoint.png'); await page.keyboard.press('Escape'); await page.waitForTimeout(800);
    // Cancellation intentionally preserves the saved checkpoint. Clear the
    // deterministic capture state before replaying the one-shot memory.
    await reset(page); await activate(page); await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await page.keyboard.press('Space'); await dialogue(page).waitFor(); await shot(page, 'mints-08-final-reflection.png'); await page.keyboard.press('Enter'); await shot(page, 'mints-09-completion.png', 300); await shot(page, 'mints-10-returned-exploration.png', 900);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4500); await shot(page, 'mints-11-completed-state.png');
    await reset(page, true); await activate(page); await shot(page, 'mints-12-reduced-motion.png', 100); await page.keyboard.press('Escape'); await page.waitForTimeout(500);

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const mobile = await mobileContext.newPage();
    mobile.on('pageerror', (error) => errors.push(`[mobile] ${error.stack ?? error.message}`)); await mobile.addInitScript(() => localStorage.removeItem('project-taj:save')); await spawnAt(mobile, -60.5); await prompt(mobile).click(); await mobile.waitForTimeout(1200); await dialogue(mobile).waitFor();
    const target = await dialogue(mobile).getByRole('button').boundingBox(); if (!target || target.width < 44 || target.height < 44) throw new Error(`Mobile target measured ${target?.width ?? 0}×${target?.height ?? 0}`);
    await shot(mobile, 'mints-13-mobile-emulated.png'); await mobileContext.close();

    await reset(page); await page.keyboard.press('KeyH'); await shot(page, 'mints-14-runtime-source-diagnostics.png'); await shot(page, 'mints-15-performance-overlay.png');
    if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`);
    console.log(`Generated and browser-validated 16 Mints captures in ${OUTPUT_DIR}`);
  } finally { if (browser) await browser.close(); if (server) server.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
