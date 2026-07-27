/**
 * One-command deterministic capture for the Phase 4E vegetation capture
 * suite. Boots a dev server with debug tools force-enabled and screenshots
 * each required view to `artifacts/review/vegetation/`. Reuses the same
 * `LightingCaptureCamera` (`V`/`M`) infrastructure as `capture-lighting.ts`
 * / `capture-charbagh.ts` — views 14-17 in `lightingCaptureViews.ts` were
 * added in this phase. Never invoked by the app itself; dev-only tooling,
 * run via `pnpm capture:vegetation`.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5188;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/vegetation');
const VIEW_COUNT = 17; // total length of LIGHTING_CAPTURE_VIEWS
const SETTLE_MS = 4000;
const INITIAL_LOAD_WAIT_MS = 20000;
const VIEWPORT = { width: 1280, height: 800 };

interface CaptureTask {
  filename: string;
  viewIndex: number;
}

const TASKS: CaptureTask[] = [
  { filename: 'vegetation-entrance-landscape.png', viewIndex: 7 },
  { filename: 'vegetation-central-axis.png', viewIndex: 1 },
  { filename: 'vegetation-left-garden-quadrant.png', viewIndex: 13 },
  { filename: 'vegetation-right-garden-quadrant.png', viewIndex: 8 },
  { filename: 'vegetation-tree-close-up.png', viewIndex: 15 },
  { filename: 'vegetation-tree-medium-distance.png', viewIndex: 13 },
  { filename: 'vegetation-tree-far-lod.png', viewIndex: 16 },
  { filename: 'vegetation-hedge-close-up.png', viewIndex: 13 },
  { filename: 'vegetation-shrub-grouping.png', viewIndex: 9 },
  { filename: 'vegetation-flower-bed-close-up.png', viewIndex: 14 },
  { filename: 'vegetation-grass-close-up.png', viewIndex: 13 },
  { filename: 'vegetation-rock-grouping.png', viewIndex: 14 },
  { filename: 'vegetation-boundary-planting.png', viewIndex: 10 },
  { filename: 'vegetation-wide-aerial.png', viewIndex: 11 },
  { filename: 'vegetation-ground-level-walking.png', viewIndex: 1 },
  { filename: 'vegetation-lod-diagnostic-near.png', viewIndex: 15 },
  { filename: 'vegetation-lod-diagnostic-far.png', viewIndex: 16 },
  { filename: 'vegetation-high-quality-profile.png', viewIndex: 13 },
];

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Dev server did not respond within ${timeoutMs}ms at ${url}`);
}

async function cyclePress(page: Page, key: string, times: number): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }
}

async function run(): Promise<{ generated: string[]; failed: { filename: string; reason: string }[] }> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const generated: string[] = [];
  const failed: { filename: string; reason: string }[] = [];

  let server: ChildProcess | undefined;
  let browser: Browser | undefined;

  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' },
      stdio: 'pipe',
    });
    await waitForServer(BASE_URL, 30_000);

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(`[browser console] ${message.text()}`);
    });
    page.on('pageerror', (error) => console.error(`[browser pageerror] ${error.message}`));
    page.setDefaultTimeout(60_000);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await page.waitForTimeout(INITIAL_LOAD_WAIT_MS);
    await page.keyboard.press('KeyV'); // enter world capture mode
    await page.waitForTimeout(1000);

    let currentView = 0;

    for (const task of TASKS) {
      try {
        await cyclePress(page, 'KeyM', (task.viewIndex - currentView + VIEW_COUNT) % VIEW_COUNT);
        currentView = task.viewIndex;
        await page.waitForTimeout(SETTLE_MS);

        const filePath = path.join(OUTPUT_DIR, task.filename);
        await page.screenshot({ path: filePath, timeout: 30_000 });
        generated.push(task.filename);
      } catch (error) {
        failed.push({ filename: task.filename, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    // Instancing diagnostic: leave capture mode, use the default exploration view with the
    // dev-only PerfHud visible (draw-call/geometry counts prove the InstancedMesh draw-call
    // collapse — one InstancedMesh per vegetation type regardless of instance count).
    await page.keyboard.press('KeyV');
    await page.waitForTimeout(2000);
    try {
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'vegetation-instancing-diagnostic.png'), timeout: 30_000 });
      generated.push('vegetation-instancing-diagnostic.png');
    } catch (error) {
      failed.push({ filename: 'vegetation-instancing-diagnostic.png', reason: error instanceof Error ? error.message : String(error) });
    }

    // Bounds/frustum diagnostic uses the same production scene with a dev-only
    // world-space wireframe envelope. Frustum culling remains enabled.
    await page.goto(`${BASE_URL}?vegetationBounds=1`, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(INITIAL_LOAD_WAIT_MS);
    await page.keyboard.press('KeyV');
    await cyclePress(page, 'KeyM', 11);
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'vegetation-bounds-frustum-diagnostic.png'), timeout: 30_000 });
    generated.push('vegetation-bounds-frustum-diagnostic.png');

    // Real capability-driven mobile tier: touch-primary context, DPR 1, and a
    // mobile viewport. This is not inferred from viewport resize alone.
    await page.close();
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await mobilePage.waitForTimeout(INITIAL_LOAD_WAIT_MS);
    await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, 'vegetation-mobile-quality-profile.png'), timeout: 30_000 });
    generated.push('vegetation-mobile-quality-profile.png');
    await mobileContext.close();
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }

  return { generated, failed };
}

run()
  .then(({ generated, failed }) => {
    console.log(`\nGenerated ${generated.length} captures in ${OUTPUT_DIR}:`);
    generated.forEach((f) => console.log(`  ✓ ${f}`));
    if (failed.length > 0) {
      console.log(`\n${failed.length} capture(s) failed:`);
      failed.forEach((f) => console.log(`  ✗ ${f.filename}: ${f.reason}`));
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error('Capture run failed to start:', error);
    process.exitCode = 1;
  });
