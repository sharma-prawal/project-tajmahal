import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5208;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/exploration-overhaul');
const VIDEO_DIR = path.join(OUTPUT_DIR, 'video');

type Telemetry = { x: number; y: number; z: number; grounded: boolean; yaw: number; pitch: number };
type Assertion = { name: string; passed: boolean; evidence: string };
const assertions: Assertion[] = [];

function record(name: string, passed: boolean, evidence: string) {
  assertions.push({ name, passed, evidence });
  if (!passed) throw new Error(`${name}: ${evidence}`);
}
async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Exploration capture server did not start');
}
async function telemetry(page: Page): Promise<Telemetry> {
  const value = await page.evaluate(() => (window as unknown as { __explorationTelemetry?: Telemetry }).__explorationTelemetry ?? null);
  if (!value) throw new Error('Exploration telemetry unavailable');
  return value;
}
async function load(page: Page, spawnAt = '3.2,2,-55') {
  const [expectedX, , expectedZ] = spawnAt.split(',').map(Number);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(`${BASE_URL}?spawn=${spawnAt}&attempt=${attempt}`, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('#root canvas');
    await page.waitForFunction(() => Boolean((window as unknown as { __explorationTelemetry?: unknown }).__explorationTelemetry));
    await page.waitForTimeout(1600);
    const current = await telemetry(page);
    if (Math.hypot(current.x - expectedX, current.z - expectedZ) < 2) return;
  }
  const current = await telemetry(page);
  throw new Error(`Debug spawn did not settle near ${spawnAt}; got ${current.x.toFixed(2)},${current.y.toFixed(2)},${current.z.toFixed(2)}`);
}
async function walk(page: Page, keys: string[], duration = 2800) {
  for (const code of keys) await page.evaluate((keyCode) => window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCode, key: keyCode.replace('Key', '').toLowerCase(), bubbles: true })), code);
  await page.waitForTimeout(duration);
  for (const code of [...keys].reverse()) await page.evaluate((keyCode) => window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCode, key: keyCode.replace('Key', '').toLowerCase(), bubbles: true })), code);
  await page.waitForTimeout(250);
}
async function walkUntil(page: Page, code: string, targetZ: number, direction: 'less' | 'greater') {
  await page.evaluate((keyCode) => window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCode, key: keyCode.replace('Key', '').toLowerCase(), bubbles: true })), code);
  try {
    await page.waitForFunction(({ target, comparison }) => {
      const value = (window as unknown as { __explorationTelemetry?: Telemetry }).__explorationTelemetry;
      return value ? (comparison === 'less' ? value.z < target : value.z > target) : false;
    }, { target: targetZ, comparison: direction }, { timeout: 75_000, polling: 200 });
  } finally {
    await page.evaluate((keyCode) => window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCode, key: keyCode.replace('Key', '').toLowerCase(), bubbles: true })), code);
  }
  await page.waitForTimeout(250);
}
async function shot(page: Page, filename: string) {
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: true, timeout: 30_000 });
}
async function resetStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('project-taj:save');
    localStorage.removeItem('project-taj:experience-settings');
  });
}
async function desktopPass(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 800 } } });
  const page = await context.newPage();
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await resetStorage(page);
  await load(page);
  await shot(page, '01-desktop-exploration-hud.png');

  const routes: Array<[string, string[]]> = [['forward', ['KeyW']], ['backward', ['KeyS']], ['left', ['KeyA']], ['right', ['KeyD']], ['diagonal', ['KeyW', 'KeyD']]];
  const traces: Array<{ route: string; before: Telemetry; after: Telemetry }> = [];
  for (const [name, keys] of routes) {
    await load(page);
    const before = await telemetry(page); await walk(page, keys); const after = await telemetry(page);
    const distance = Math.hypot(after.x - before.x, after.z - before.z);
    record(`movement-${name}`, distance > 1.5, `horizontal displacement ${distance.toFixed(2)}m`);
    traces.push({ route: name, before, after });
  }

  await load(page);
  const cameraBefore = await telemetry(page);
  await page.getByRole('button', { name: 'Rotate camera left' }).click();
  const cameraAfter = await telemetry(page);
  record('camera-button', Math.abs(cameraAfter.yaw - cameraBefore.yaw) > 0.1, `yaw ${cameraBefore.yaw.toFixed(3)} → ${cameraAfter.yaw.toFixed(3)}`);
  await page.getByRole('button', { name: 'Reset camera' }).click();
  await page.waitForFunction(() => {
    const value = (window as unknown as { __explorationTelemetry?: Telemetry }).__explorationTelemetry;
    return value ? Math.abs(value.yaw) < 0.01 && Math.abs(value.pitch) < 0.01 : false;
  }, undefined, { timeout: 3_000, polling: 100 });
  const reset = await telemetry(page);
  record('camera-reset', Math.abs(reset.yaw) < 0.01 && Math.abs(reset.pitch) < 0.01, `yaw=${reset.yaw.toFixed(3)}, pitch=${reset.pitch.toFixed(3)}`);

  const canvas = page.locator('#root canvas'); const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounds');
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.48);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.48, { steps: 10 }); await page.mouse.up();
  const drag = await telemetry(page);
  record('mouse-drag-look', Math.abs(drag.yaw) > 0.15, `drag yaw=${drag.yaw.toFixed(3)}`);

  await page.getByRole('button', { name: 'Open settings and controls' }).click();
  await shot(page, '02-settings-and-controls.png');
  const lockedBefore = await telemetry(page); await walk(page, ['KeyW'], 700); const lockedAfter = await telemetry(page);
  record('modal-input-lock', Math.hypot(lockedAfter.x - lockedBefore.x, lockedAfter.z - lockedBefore.z) < 0.3, 'movement stayed locked while settings owned input');
  await page.getByRole('button', { name: 'Replay tutorial' }).click();
  await shot(page, '03-progressive-onboarding.png');
  await page.getByRole('button', { name: 'Skip' }).click();

  await load(page, '0,2,-151'); const ascentBefore = await telemetry(page); await walkUntil(page, 'KeyW', -162.5, 'less'); const ascentAfter = await telemetry(page);
  record('stair-ascent', ascentAfter.z < ascentBefore.z - 8 && ascentAfter.y > ascentBefore.y + 2, `(${ascentBefore.y.toFixed(2)}, ${ascentBefore.z.toFixed(2)}) → (${ascentAfter.y.toFixed(2)}, ${ascentAfter.z.toFixed(2)})`);
  await shot(page, '04-stair-ascent-and-platform.png');
  await load(page, '0,5,-166'); const descentBefore = await telemetry(page); await walkUntil(page, 'KeyS', -155, 'greater'); const descentAfter = await telemetry(page);
  record('stair-descent', descentAfter.z > descentBefore.z + 7 && descentAfter.y < descentBefore.y - 1.5, `(${descentBefore.y.toFixed(2)}, ${descentBefore.z.toFixed(2)}) → (${descentAfter.y.toFixed(2)}, ${descentAfter.z.toFixed(2)})`);

  await load(page, '18,2,-147.5');
  const activated = await page.evaluate(() => (window as unknown as { __memoryRuntime?: { activate: (id: string) => boolean } }).__memoryRuntime?.activate('production.memory.friday-night') ?? false);
  record('memory-entry', activated, 'Friday Night activated through the production runtime');
  await page.getByRole('dialog', { name: 'Memory narration' }).waitFor({ timeout: 10_000 });
  await shot(page, '05-memory-input-ownership.png');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const runtime = (window as unknown as {
      __memoryRuntime?: { getSnapshot: () => { activeMemoryId: string | null } };
    }).__memoryRuntime;
    return runtime?.getSnapshot().activeMemoryId === null;
  }, undefined, { timeout: 3_000, polling: 50 });
  const releasedBefore = await telemetry(page);
  await page.getByRole('button', { name: 'Rotate camera left' }).click();
  await page.waitForTimeout(100);
  const releasedAfter = await telemetry(page);
  record(
    'memory-exit-restores-camera',
    Math.abs(releasedAfter.yaw - releasedBefore.yaw) > 0.1,
    `yaw ${releasedBefore.yaw.toFixed(3)} → ${releasedAfter.yaw.toFixed(3)}`,
  );

  record('browser-page-errors', browserErrors.length === 0, browserErrors.join('; ') || 'none');
  await writeFile(path.join(OUTPUT_DIR, 'movement-trace.json'), `${JSON.stringify(traces, null, 2)}\n`);
  await context.close();
}
async function mobilePass(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage(); await resetStorage(page); await load(page);
  await shot(page, '06-mobile-touch-controls.png');
  const moveLabel = page.getByText('Move', { exact: true }); const lookLabel = page.getByText('Drag to look', { exact: true });
  record('mobile-affordances', await moveLabel.isVisible() && await lookLabel.isVisible(), 'move and look zones are visible');
  await page.getByRole('button', { name: 'Open settings and controls' }).click(); await shot(page, '07-mobile-settings.png');
  await context.close();
}

async function run() {
  await mkdir(VIDEO_DIR, { recursive: true });
  let server: ChildProcess | undefined; let browser: Browser | undefined;
  try {
    server = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' });
    await waitForServer(); browser = await chromium.launch();
    await desktopPass(browser); await mobilePass(browser);
    await writeFile(path.join(OUTPUT_DIR, 'exploration-validation.json'), `${JSON.stringify({ measuredAt: new Date().toISOString(), environment: 'Playwright Chromium / SwiftShader; automated browser evidence, not physical-device validation', assertions }, null, 2)}\n`);
    console.log(`Validated ${assertions.length} exploration checks; captures, trace, and video written to ${OUTPUT_DIR}`);
  } finally { if (browser) await browser.close(); if (server) server.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
