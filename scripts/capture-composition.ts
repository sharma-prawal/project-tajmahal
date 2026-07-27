import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5224;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/composition');
const VIEW_COUNT = 27;
const DESKTOP_VIEWS = [
  { index: 0, name: '01-entrance-reveal.png' },
  { index: 1, name: '02-central-axis.png' },
  { index: 18, name: '03-fountain-and-beds.png' },
  { index: 20, name: '04-memory-mints.png' },
  { index: 21, name: '05-memory-back.png' },
  { index: 22, name: '06-memory-umbrella.png' },
  { index: 23, name: '07-memory-little-details.png' },
  { index: 24, name: '08-memory-all-day-call.png' },
  { index: 25, name: '09-memory-boarding-passes.png' },
  { index: 26, name: '10-memory-friday-night.png' },
  { index: 3, name: '11-taj-approach.png' },
  { index: 8, name: '12-cross-axis.png' },
  { index: 11, name: '13-wide-aerial.png' },
] as const;

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      if ((await fetch(BASE_URL)).ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Composition capture server did not start');
}

async function load(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('project-taj:save');
    localStorage.removeItem('project-taj:experience-settings');
  });
  await page.goto(`${BASE_URL}?cleanCapture=1`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('#root canvas');
  await page.waitForTimeout(9_000);
  await page.addStyleTag({
    content: 'body > div:not(#root), #stats, .stats, .experience-hud, .camera-controls, .perf-hud { display: none !important; }',
  });
  await page.keyboard.press('KeyV');
}

async function selectView(page: Page, current: number, target: number) {
  const presses = (target - current + VIEW_COUNT) % VIEW_COUNT;
  for (let index = 0; index < presses; index += 1) await page.keyboard.press('KeyM');
  await page.waitForTimeout(1_000);
  return target;
}

async function shot(page: Page, name: string) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('#root div').forEach((element) => {
      if (getComputedStyle(element).position === 'fixed') element.style.display = 'none';
    });
    document.querySelectorAll<HTMLElement>('.experience-hud, .camera-controls, #stats, .perf-hud').forEach((element) => {
      element.style.display = 'none';
    });
  });
  await page.locator('#root canvas').screenshot({ path: path.join(OUTPUT_DIR, name), timeout: 30_000 });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  const errors: string[] = [];
  try {
    server = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--strictPort'], {
      env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' },
      stdio: 'pipe',
    });
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (error) => errors.push(`[desktop] ${error.message}`));
    await load(page);
    let current = 0;
    for (const view of DESKTOP_VIEWS) {
      current = await selectView(page, current, view.index);
      await shot(page, view.name);
    }

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
    });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', (error) => errors.push(`[mobile] ${error.message}`));
    await load(mobile);
    await selectView(mobile, 0, 1);
    await shot(mobile, '14-mobile-central-axis.png');
    await mobileContext.close();

    if (errors.length > 0) throw new Error(errors.join('\n'));
    await writeFile(path.join(OUTPUT_DIR, 'capture-validation.json'), `${JSON.stringify({
      measuredAt: new Date().toISOString(),
      environment: 'Playwright Chromium / SwiftShader; not physical-device validation',
      captures: [...DESKTOP_VIEWS.map(({ name }) => name), '14-mobile-central-axis.png'],
      pageErrors: [],
    }, null, 2)}\n`);
    console.log(`Generated and browser-validated ${DESKTOP_VIEWS.length + 1} composition captures in ${OUTPUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
