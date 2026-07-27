import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5196;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/memory-back');
const BACK_SPAWN = '-38.3,2,-136';

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Back capture server did not start');
}
async function spawnAt(page: Page, spawnPoint: string) {
  await page.goto(`${BASE_URL}?spawn=${spawnPoint}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(4500);
}
async function shot(page: Page, name: string, settle = 300) {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(OUTPUT_DIR, name), timeout: 30_000 });
}
const dialogue = (page: Page) => page.getByRole('dialog', { name: 'Memory narration' });
const rememberPrompt = (page: Page) => page.getByRole('button', { name: 'Remember That One Word: Back' });
const replayPrompt = (page: Page) => page.getByRole('button', { name: 'Replay That One Word: Back' });
async function reset(page: Page, reduced = false, completed = false) {
  await page.evaluate(({ reducedMotion, isCompleted }) => (window as unknown as { __backCaptureReset?: (reduced: boolean, completed?: boolean) => void }).__backCaptureReset?.(reducedMotion, isCompleted), { reducedMotion: reduced, isCompleted: completed });
  await page.waitForTimeout(700);
}
async function activate(page: Page, replay = false) {
  await (replay ? replayPrompt(page) : rememberPrompt(page)).waitFor();
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1250);
  await dialogue(page).waitFor();
}
async function toBackBeat(page: Page) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(520);
  await dialogue(page).waitFor();
  const word = dialogue(page).getByText('Back.', { exact: true });
  await word.waitFor();
  const presentation = await dialogue(page).getAttribute('data-presentation');
  if (presentation !== 'emphasis') throw new Error(`Back presentation was ${presentation ?? 'missing'}`);
}
async function complete(page: Page) {
  await toBackBeat(page);
  await page.keyboard.press('Enter');
  await dialogue(page).waitFor();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1050);
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let server: ChildProcess | undefined; let browser: Browser | undefined; const errors: string[] = [];
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' });
    await waitForServer(); browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await spawnAt(page, '-38.3,2,-126'); await page.evaluate(() => localStorage.removeItem('project-taj:save')); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4500);
    await shot(page, 'back-01-environmental-anchor.png');
    await spawnAt(page, BACK_SPAWN); await rememberPrompt(page).waitFor(); await shot(page, 'back-02-eligible-prompt.png');
    await page.keyboard.press('KeyE'); await shot(page, 'back-03-activation.png', 180); await shot(page, 'back-05-camera-composition.png', 500); await page.waitForTimeout(700); await dialogue(page).waitFor();
    await shot(page, 'back-04-first-narration.png');
    await page.keyboard.press('Enter'); await shot(page, 'back-06-absence-state.png', 120); await page.waitForTimeout(420); await dialogue(page).waitFor(); await shot(page, 'back-07-standalone-word.png');
    await page.keyboard.press('Enter'); await dialogue(page).waitFor(); await shot(page, 'back-08-return-world-action.png'); await shot(page, 'back-09-final-reflection.png');
    await page.keyboard.press('Enter'); await shot(page, 'back-10-completion-state.png', 160); await shot(page, 'back-11-returned-exploration.png', 1100); await replayPrompt(page).waitFor(); await shot(page, 'back-12-replay-prompt.png');
    await page.keyboard.press('KeyE'); await page.waitForTimeout(1250); await dialogue(page).waitFor(); await toBackBeat(page); await shot(page, 'back-13-intentional-replay.png'); await page.keyboard.press('Escape'); await page.waitForTimeout(1000);

    await reset(page, true); await activate(page); await toBackBeat(page); await shot(page, 'back-14-reduced-motion.png'); await page.keyboard.press('Escape'); await page.waitForTimeout(700);

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mobile = await mobileContext.newPage(); mobile.on('pageerror', (error) => errors.push(`[mobile] ${error.stack ?? error.message}`));
    await mobile.addInitScript(() => localStorage.removeItem('project-taj:save')); await spawnAt(mobile, BACK_SPAWN); await rememberPrompt(mobile).click(); await mobile.waitForTimeout(1250); await dialogue(mobile).waitFor();
    const target = await dialogue(mobile).getByRole('button').boundingBox(); if (!target || target.width < 44 || target.height < 44) throw new Error(`Mobile target measured ${target?.width ?? 0}×${target?.height ?? 0}`);
    await shot(mobile, 'back-15-mobile-emulation.png'); await complete(mobile); await replayPrompt(mobile).waitFor(); await replayPrompt(mobile).click(); await mobile.waitForTimeout(1250); await dialogue(mobile).waitFor(); await toBackBeat(mobile); await shot(mobile, 'back-16-mobile-replay.png'); await mobileContext.close();

    await reset(page); await activate(page); await page.keyboard.press('Enter'); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(5000); await dialogue(page).waitFor(); await dialogue(page).getByText('Back.', { exact: true }).waitFor(); await shot(page, 'back-19-restoration-state.png');
    await page.keyboard.press('KeyH'); await shot(page, 'back-17-runtime-diagnostics.png'); await shot(page, 'back-18-performance-overlay.png'); await page.keyboard.press('Escape'); await page.waitForTimeout(800);

    await reset(page); await page.evaluate(() => localStorage.removeItem('project-taj:save')); await spawnAt(page, '-22,2,-60.5'); const mintsPrompt = page.getByRole('button', { name: 'Remember The Mints' }); await mintsPrompt.waitFor(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1250); await dialogue(page).waitFor(); await shot(page, 'back-20-mints-regression.png');
    if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`);
    console.log(`Generated and browser-validated 20 Back captures in ${OUTPUT_DIR}`);
  } finally { if (browser) await browser.close(); if (server) server.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
