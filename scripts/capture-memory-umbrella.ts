import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5197; const BASE_URL = `http://localhost:${PORT}`; const OUTPUT_DIR = path.resolve('artifacts/review/memory-umbrella'); const UMBRELLA_SPAWN = '38.3,2,-136';
async function waitForServer() { const start = Date.now(); while (Date.now() - start < 30_000) { try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 300)); } throw new Error('Umbrella capture server did not start'); }
async function spawnAt(page: Page, point: string) { await page.goto(`${BASE_URL}?spawn=${point}`, { waitUntil: 'networkidle', timeout: 60_000 }); await page.waitForSelector('canvas'); await page.waitForTimeout(4500); }
async function shot(page: Page, name: string, settle = 300) { await page.waitForTimeout(settle); await page.screenshot({ path: path.join(OUTPUT_DIR, name), timeout: 30_000 }); }
const dialogue = (page: Page) => page.getByRole('dialog', { name: 'Memory narration' });
const rememberPrompt = (page: Page) => page.getByRole('button', { name: 'Remember The Umbrella' });
const replayPrompt = (page: Page) => page.getByRole('button', { name: 'Replay The Umbrella' });
async function reset(page: Page, reduced = false, completed = false) { await page.evaluate(({ reducedMotion, isCompleted }) => (window as unknown as { __umbrellaCaptureReset?: (reduced: boolean, completed?: boolean) => void }).__umbrellaCaptureReset?.(reducedMotion, isCompleted), { reducedMotion: reduced, isCompleted: completed }); await page.waitForTimeout(700); }
async function activate(page: Page, replay = false) { await (replay ? replayPrompt(page) : rememberPrompt(page)).waitFor(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1250); await dialogue(page).waitFor(); }
async function complete(page: Page) { await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await page.keyboard.press('Enter'); await page.waitForTimeout(1050); }

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true }); let server: ChildProcess | undefined; let browser: Browser | undefined; const errors: string[] = [];
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' }); await waitForServer(); browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await spawnAt(page, '38.3,2,-126'); await page.evaluate(() => localStorage.removeItem('project-taj:save')); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4500); await shot(page, 'umbrella-01-environmental-shelter.png');
    await spawnAt(page, UMBRELLA_SPAWN); await rememberPrompt(page).waitFor(); await shot(page, 'umbrella-02-eligible-prompt.png'); await page.keyboard.press('KeyE'); await shot(page, 'umbrella-03-activation.png', 180); await shot(page, 'umbrella-05-shelter-composition.png', 520); await page.waitForTimeout(650); await dialogue(page).waitFor(); await shot(page, 'umbrella-04-reminder-narration.png');
    await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await shot(page, 'umbrella-06-walk-outside-narration.png'); await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await shot(page, 'umbrella-07-path-world-action.png'); await page.keyboard.press('Enter'); await shot(page, 'umbrella-08-completion.png', 180); await shot(page, 'umbrella-09-returned-exploration.png', 1100); await replayPrompt(page).waitFor(); await shot(page, 'umbrella-10-replay-prompt.png');
    await page.keyboard.press('KeyE'); await page.waitForTimeout(1250); await dialogue(page).waitFor(); await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await shot(page, 'umbrella-11-intentional-replay.png'); await page.keyboard.press('Escape'); await page.waitForTimeout(900);
    await reset(page, true); await activate(page); await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await shot(page, 'umbrella-12-reduced-motion.png'); await page.keyboard.press('Escape'); await page.waitForTimeout(700);

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const mobile = await mobileContext.newPage(); mobile.on('pageerror', (error) => errors.push(`[mobile] ${error.stack ?? error.message}`)); await mobile.addInitScript(() => localStorage.removeItem('project-taj:save')); await spawnAt(mobile, UMBRELLA_SPAWN); await rememberPrompt(mobile).click(); await mobile.waitForTimeout(1250); await dialogue(mobile).waitFor(); const target = await dialogue(mobile).getByRole('button').boundingBox(); if (!target || target.width < 44 || target.height < 44) throw new Error(`Mobile target measured ${target?.width ?? 0}×${target?.height ?? 0}`); await shot(mobile, 'umbrella-13-mobile.png'); await complete(mobile); await replayPrompt(mobile).waitFor(); await mobileContext.close();

    await reset(page); await activate(page); await page.keyboard.press('Enter'); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(5000); await dialogue(page).waitFor(); await dialogue(page).getByText('…just so you could walk outside and see me off.', { exact: true }).waitFor(); await shot(page, 'umbrella-16-restoration.png'); await page.keyboard.press('KeyH'); await shot(page, 'umbrella-14-diagnostics.png'); await shot(page, 'umbrella-15-performance-overlay.png'); await page.keyboard.press('Escape'); await page.waitForTimeout(700);

    await reset(page); await page.evaluate(() => localStorage.removeItem('project-taj:save')); await spawnAt(page, '-22,2,-60.5'); await page.getByRole('button', { name: 'Remember The Mints' }).waitFor(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1250); await dialogue(page).waitFor(); await shot(page, 'umbrella-17-mints-regression.png');
    await page.keyboard.press('Escape'); await page.waitForTimeout(700); await reset(page); await page.evaluate(() => localStorage.removeItem('project-taj:save')); await spawnAt(page, '-38.3,2,-136'); await page.getByRole('button', { name: 'Remember That One Word: Back' }).waitFor(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1250); await dialogue(page).waitFor(); await page.keyboard.press('Enter'); await page.waitForTimeout(520); await dialogue(page).getByText('Back.', { exact: true }).waitFor(); await shot(page, 'umbrella-18-back-regression.png');
    if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`); console.log(`Generated and browser-validated 18 Umbrella captures in ${OUTPUT_DIR}`);
  } finally { if (browser) await browser.close(); if (server) server.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
