/**
 * One-command deterministic capture for the Phase 4D Charbagh grounds
 * capture suite. Boots a dev server with debug tools force-enabled and
 * screenshots each required view to `artifacts/review/charbagh/`. Reuses
 * the same `LightingCaptureCamera` (`V`/`M`) infrastructure as
 * `capture-lighting.ts` — views 8-13 in `lightingCaptureViews.ts` were
 * added in this phase for exactly this purpose. Never invoked by the app
 * itself; dev-only tooling, run via `pnpm capture:charbagh`.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5187;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/charbagh');
const VIEW_COUNT = 17; // total length of LIGHTING_CAPTURE_VIEWS
const SETTLE_MS = 4000;
const INITIAL_LOAD_WAIT_MS = 20000;
const VIEWPORT = { width: 1280, height: 800 };

interface CaptureTask {
  filename: string;
  viewIndex: number;
}

const TASKS: CaptureTask[] = [
  { filename: 'charbagh-entrance-plaza.png', viewIndex: 7 },
  { filename: 'charbagh-main-axis.png', viewIndex: 1 },
  { filename: 'charbagh-cross-axis.png', viewIndex: 8 },
  { filename: 'charbagh-reflecting-pool.png', viewIndex: 2 },
  { filename: 'charbagh-platform-stairs.png', viewIndex: 9 },
  { filename: 'charbagh-boundary-wall.png', viewIndex: 10 },
  { filename: 'charbagh-aerial-overview.png', viewIndex: 11 },
  { filename: 'charbagh-low-angle-architectural.png', viewIndex: 5 },
  { filename: 'charbagh-top-down-layout.png', viewIndex: 12 },
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
    page.setDefaultTimeout(60_000);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await page.waitForTimeout(INITIAL_LOAD_WAIT_MS);
    await page.keyboard.press('KeyV'); // enter lighting/world capture mode
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

    // Developer collision visualization: leave capture mode, rely on the exploration camera's
    // default forecourt spawn view with Rapier's physics debug wireframe (already enabled
    // whenever env.enableDebugTools is on — see CanvasRoot's `<Physics debug={...}>`).
    await page.keyboard.press('KeyV');
    await page.waitForTimeout(2000);
    try {
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'charbagh-collision-diagnostic.png'), timeout: 30_000 });
      generated.push('charbagh-collision-diagnostic.png');
    } catch (error) {
      failed.push({ filename: 'charbagh-collision-diagnostic.png', reason: error instanceof Error ? error.message : String(error) });
    }

    await page.close();
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
