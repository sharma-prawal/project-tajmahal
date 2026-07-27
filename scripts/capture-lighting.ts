/**
 * One-command deterministic capture for the Phase 4B lighting/atmosphere
 * review pack. Boots a dev server with debug tools force-enabled, drives
 * the production scene's lighting-debug keyboard controls (the same ones a
 * human reviewer uses), and screenshots each entry in the required capture
 * list to `artifacts/review/lighting/`. Never invoked by the app itself;
 * dev-only tooling, run via `pnpm capture:lighting`.
 *
 * This scene (the real Taj model, ~183K triangles, plus a 2048 shadow map,
 * a procedural PMREM environment map, and a baked contact-shadow pass) is
 * far heavier than the bake-off slice `capture-bakeoff.ts` captures, and
 * this environment's WebGL rendering has been observed to be extremely
 * slow (multi-second frame times) during manual verification — so this
 * script uses much longer settle waits than `capture-bakeoff.ts` and a
 * generous per-page timeout. See docs/phase-4/lighting-atmosphere.md
 * "Known limitations" for the full account.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5185;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/lighting');
// Must match the *total* length of LIGHTING_CAPTURE_VIEWS (13 as of Phase 4D), not just the
// 7 views this script targets — `next()`'s wraparound in the store uses the real array length.
const VIEW_COUNT = 17;
const SETTLE_MS = 4000;
const INITIAL_LOAD_WAIT_MS = 20000;

type Viewport = { width: number; height: number };
const DESKTOP_VIEWPORT: Viewport = { width: 1280, height: 800 };
const MOBILE_VIEWPORT: Viewport = { width: 390, height: 844 };

interface CaptureTask {
  filename: string;
  viewport: Viewport;
  viewIndex: number;
  presetPresses: number; // KeyP presses from 'sunT' baseline
  fogToggle: boolean; // whether to press F once (fog off)
  exposurePresses: number; // KeyE presses from 'auto' baseline
  shadowDiagnostic: boolean;
}

const VIEW_LABELS = [
  'entrance-gate',
  'central-axis',
  'reflecting-pool',
  'front-taj',
  'three-quarter',
  'low-angle',
  'distant-silhouette',
];

function baseTask(filename: string, viewIndex: number, overrides: Partial<CaptureTask> = {}): CaptureTask {
  return {
    filename,
    viewport: DESKTOP_VIEWPORT,
    viewIndex,
    presetPresses: 0,
    fogToggle: false,
    exposurePresses: 0,
    shadowDiagnostic: false,
    ...overrides,
  };
}

function buildMatrix(): CaptureTask[] {
  const tasks: CaptureTask[] = [];

  // The seven required named views, sunset lighting, desktop.
  VIEW_LABELS.forEach((label, i) => {
    tasks.push(baseTask(`lighting-desktop-${label}-sunset.png`, i));
  });

  // Shadow diagnostic — front Taj view, shadow-camera frustum overlay on.
  tasks.push(baseTask('lighting-diagnostic-shadow-camera.png', 3, { shadowDiagnostic: true }));

  // Fog off/on comparison — central axis view (longest sightline).
  tasks.push(baseTask('lighting-fog-on-central-axis.png', 1));
  tasks.push(baseTask('lighting-fog-off-central-axis.png', 1, { fogToggle: true }));

  // Exposure comparison — front Taj view, three exposure steps.
  tasks.push(baseTask('lighting-exposure-auto-front-taj.png', 3, { exposurePresses: 0 }));
  tasks.push(baseTask('lighting-exposure-low-front-taj.png', 3, { exposurePresses: 1 }));
  tasks.push(baseTask('lighting-exposure-high-front-taj.png', 3, { exposurePresses: 5 }));

  // Neutral lighting reference — front Taj view.
  tasks.push(baseTask('lighting-preset-neutral-front-taj.png', 3, { presetPresses: 1 }));

  // Final sunset (forced sunT=1) — front Taj + distant silhouette.
  tasks.push(baseTask('lighting-preset-final-sunset-front-taj.png', 3, { presetPresses: 2 }));
  tasks.push(baseTask('lighting-preset-final-sunset-distant-silhouette.png', 6, { presetPresses: 2 }));

  // Mobile profile — three key views at the mobile viewport.
  tasks.push(baseTask('lighting-mobile-entrance-gate-sunset.png', 0, { viewport: MOBILE_VIEWPORT }));
  tasks.push(baseTask('lighting-mobile-front-taj-sunset.png', 3, { viewport: MOBILE_VIEWPORT }));
  tasks.push(baseTask('lighting-mobile-distant-silhouette-sunset.png', 6, { viewport: MOBILE_VIEWPORT }));

  return tasks;
}

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
    const matrix = buildMatrix();

    let currentViewport: Viewport | null = null;
    let page: Page | null = null;
    let state = { view: 0, preset: 0, fog: false, exposure: 0, shadowDiagnostic: false };

    for (const task of matrix) {
      try {
        const viewportChanged =
          !currentViewport || currentViewport.width !== task.viewport.width || currentViewport.height !== task.viewport.height;
        if (viewportChanged || !page) {
          if (page) await page.close();
          page = await browser.newPage({ viewport: task.viewport });
          page.setDefaultTimeout(60_000);
          await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
          await page.waitForSelector('canvas', { timeout: 30_000 });
          await page.waitForTimeout(INITIAL_LOAD_WAIT_MS); // heavy scene: real Taj model + shadow map + PMREM
          await page.keyboard.press('KeyV'); // enter lighting capture mode
          await page.waitForTimeout(1000);
          currentViewport = task.viewport;
          state = { view: 0, preset: 0, fog: false, exposure: 0, shadowDiagnostic: false };
        }

        if (task.fogToggle !== state.fog) {
          await page!.keyboard.press('KeyF');
          state.fog = task.fogToggle;
        }
        if (task.presetPresses !== state.preset) {
          await cyclePress(page!, 'KeyP', (task.presetPresses - state.preset + 3) % 3);
          state.preset = task.presetPresses;
        }
        if (task.exposurePresses !== state.exposure) {
          await cyclePress(page!, 'KeyE', (task.exposurePresses - state.exposure + 6) % 6);
          state.exposure = task.exposurePresses;
        }
        if (task.shadowDiagnostic !== state.shadowDiagnostic) {
          await page!.keyboard.press('KeyX');
          state.shadowDiagnostic = task.shadowDiagnostic;
        }
        await cyclePress(page!, 'KeyM', (task.viewIndex - state.view + VIEW_COUNT) % VIEW_COUNT);
        state.view = task.viewIndex;

        await page!.waitForTimeout(SETTLE_MS);

        const filePath = path.join(OUTPUT_DIR, task.filename);
        await page!.screenshot({ path: filePath, timeout: 30_000 });
        generated.push(task.filename);
      } catch (error) {
        failed.push({ filename: task.filename, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    if (page) await (page as Page).close();
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
