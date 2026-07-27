import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5212;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/phase-8c');
const VIDEO_DIR = path.join(OUTPUT_DIR, 'video-temp');

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Phase 8C capture server did not start');
}

async function prepare(page: Page, spawnPoint = '0,2,-3', quality: 'high' | 'performance' = 'high', reviewView?: 'fountain') {
  await page.addInitScript(({ selectedQuality }) => {
    localStorage.setItem('project-taj:experience-settings', JSON.stringify({ state: {
      cameraSensitivity: 1, invertCameraY: false, movementSpeed: 1, quality: selectedQuality,
      shadows: true, interfaceScale: 1, tutorialDismissed: true,
    }, version: 0 }));
    localStorage.removeItem('project-taj:save');
  }, { selectedQuality: quality });
  await page.goto(`${BASE_URL}?cleanCapture=1&spawn=${spawnPoint}${reviewView ? `&phase8cView=${reviewView}` : ''}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('#root canvas');
  await page.waitForTimeout(8_000);
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('#root div').forEach((element) => { if (getComputedStyle(element).position === 'fixed') element.style.display = 'none'; });
    document.querySelectorAll<HTMLElement>('.experience-hud,.camera-controls,#stats').forEach((element) => { element.style.display = 'none'; });
  });
}

async function shot(page: Page, filename: string) {
  await page.waitForTimeout(500);
  await page.locator('#root canvas').screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 30_000 });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  const errors: string[] = [];
  const captures: string[] = [];
  try {
    server = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' });
    await waitForServer();
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(`[desktop] ${error.message}`));
    await prepare(page);
    for (const [filename, action] of [
      ['01-heroine-idle.png', async () => {}],
      ['02-heroine-walk.png', async () => { await page.keyboard.down('KeyW'); await page.waitForTimeout(900); }],
      ['03-heroine-run.png', async () => { await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(900); }],
      ['04-heroine-turn.png', async () => { await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); await page.keyboard.down('KeyD'); await page.waitForTimeout(700); }],
    ] as const) {
      await action(); await shot(page, filename); captures.push(filename);
    }
    await page.keyboard.up('KeyD');
    await page.mouse.move(720, 450); await page.mouse.down(); await page.mouse.move(920, 420, { steps: 12 }); await page.mouse.up();
    await shot(page, '05-heroine-three-quarter.png'); captures.push('05-heroine-three-quarter.png');
    const video = page.video();
    await context.close();
    if (video) await rename(await video.path(), path.join(OUTPUT_DIR, 'heroine-locomotion.webm'));

    const fountain = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    fountain.on('pageerror', (error) => errors.push(`[fountain] ${error.message}`));
    await prepare(fountain, '3,2,-50', 'high', 'fountain');
    await shot(fountain, '06-fountain-approach.png'); captures.push('06-fountain-approach.png');
    await fountain.keyboard.down('KeyW'); await fountain.waitForTimeout(1300); await fountain.keyboard.up('KeyW');
    await shot(fountain, '07-fountain-close.png'); captures.push('07-fountain-close.png');
    await fountain.close();

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', (error) => errors.push(`[mobile] ${error.message}`));
    await prepare(mobile, '0,2,-3', 'performance');
    await shot(mobile, '08-mobile-heroine.png'); captures.push('08-mobile-heroine.png');
    await mobileContext.close();

    if (errors.length) throw new Error(errors.join('\n'));
    await writeFile(path.join(OUTPUT_DIR, 'capture-validation.json'), `${JSON.stringify({
      measuredAt: new Date().toISOString(),
      environment: 'Playwright Chromium / SwiftShader; not physical-device validation',
      captures,
      video: 'heroine-locomotion.webm',
      pageErrors: [],
    }, null, 2)}\n`);
    console.log(`Generated ${captures.length} Phase 8C captures and one locomotion video.`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
