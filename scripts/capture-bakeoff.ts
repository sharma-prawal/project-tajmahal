/**
 * One-command deterministic capture for the Taj bake-off review pack
 * (Phase 3B Part 3). Boots a dev server with debug tools force-enabled,
 * drives the existing in-app review-mode keyboard controls (the same ones
 * a human reviewer uses — see docs/phase-3/taj-bakeoff-review.md Part 9),
 * and screenshots each entry in the capture matrix to
 * `artifacts/review/taj-bakeoff/`. Never invoked by the app itself; dev-only
 * tooling, run via `pnpm capture:bakeoff`.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import {
  REVIEW_BACKGROUND_ORDER,
  REVIEW_DIAGNOSTIC_ORDER,
  REVIEW_LOD_ORDER,
  REVIEW_TIER_ORDER,
  type ReviewBackground,
  type ReviewDiagnostic,
  type ReviewLodOverride,
  type ReviewMaterial,
  type ReviewTier,
} from '../src/core/bakeoff/reviewConfig';

const PORT = 5183;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/taj-bakeoff');
const VIEW_COUNT = 6;

interface CaptureTask {
  filename: string;
  viewport: { width: number; height: number };
  viewIndex: number; // 0-indexed into BAKEOFF_REVIEW_VIEWS
  background: ReviewBackground;
  tier: ReviewTier;
  lodOverride: ReviewLodOverride;
  fog: boolean;
  shadows: boolean;
  diagnostic: ReviewDiagnostic;
  candidateIndex: number;
  material: ReviewMaterial;
}

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

const VIEW_LABELS = ['frontal', 'three-quarter-left', 'side', 'low-angle-dome', 'minaret-close-medium', 'distant-silhouette'];

const CANDIDATE_LABEL = 'code-assembled';

function desktopHighMatrix(candidateIndex: number): CaptureTask[] {
  const tasks: CaptureTask[] = [];
  for (const material of ['ivoryMarble', 'neutralClay'] as const) {
    for (const background of ['neutral', 'sunset'] as const) {
      for (let v = 0; v < VIEW_COUNT; v += 1) {
      tasks.push({
        filename: `${CANDIDATE_LABEL}-desktop-high-${material === 'ivoryMarble' ? 'original' : 'standardised'}-${VIEW_LABELS[v]}-${background}.png`,
        viewport: DESKTOP_VIEWPORT,
        viewIndex: v,
        background,
        tier: 'desktopHigh',
        lodOverride: 'lod0',
        fog: true,
        shadows: true,
        diagnostic: 'none',
        candidateIndex,
        material,
      });
      }
    }
  }
  return tasks;
}

function mobileHighMatrix(candidateIndex: number): CaptureTask[] {
  return [0, 1, 5].map((v) => ({
      filename: `${CANDIDATE_LABEL}-mobile-high-original-${VIEW_LABELS[v]}-sunset.png`,
      viewport: MOBILE_VIEWPORT,
      viewIndex: v,
      background: 'sunset',
      tier: 'mobileHigh',
      lodOverride: 'auto',
      fog: true,
      shadows: true,
      diagnostic: 'none',
      candidateIndex,
      material: 'ivoryMarble' as const,
  }));
}

function diagnosticMatrix(candidateIndex: number): CaptureTask[] {
  const diagnostics: { diagnostic: ReviewDiagnostic; filename: string; viewIndex: number }[] = [
    { diagnostic: 'wireframe', filename: `${CANDIDATE_LABEL}-diagnostic-wireframe-frontal.png`, viewIndex: 0 },
    { diagnostic: 'materialSlots', filename: `${CANDIDATE_LABEL}-diagnostic-material-slots.png`, viewIndex: 1 },
    { diagnostic: 'silhouetteMask', filename: `${CANDIDATE_LABEL}-diagnostic-silhouette-mask.png`, viewIndex: 1 },
    { diagnostic: 'bounds', filename: `${CANDIDATE_LABEL}-diagnostic-bounds.png`, viewIndex: 1 },
  ];
  return diagnostics.map((d) => ({
    filename: d.filename,
    viewport: DESKTOP_VIEWPORT,
    viewIndex: d.viewIndex,
    background: 'neutral' as const,
    tier: 'desktopHigh' as const,
    lodOverride: 'lod0' as const,
    fog: false,
    shadows: true,
    diagnostic: d.diagnostic,
    candidateIndex,
    material: 'ivoryMarble' as const,
  }));
}

function buildMatrix(): CaptureTask[] {
  return [
    ...desktopHighMatrix(0),
    ...mobileHighMatrix(0),
    ...diagnosticMatrix(0),
  ];
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
  }
}

async function applyConfig(page: Page, task: CaptureTask, state: { view: number; background: ReviewBackground; tier: ReviewTier; lod: ReviewLodOverride; diagnostic: ReviewDiagnostic; fog: boolean; shadows: boolean; candidateIndex: number; material: ReviewMaterial }): Promise<void> {
  if (state.material !== task.material) {
    await page.keyboard.press('Digit6');
    state.material = task.material;
  }
  const backgroundSteps =
    (REVIEW_BACKGROUND_ORDER.indexOf(task.background) - REVIEW_BACKGROUND_ORDER.indexOf(state.background) + REVIEW_BACKGROUND_ORDER.length) %
    REVIEW_BACKGROUND_ORDER.length;
  await cyclePress(page, 'Digit1', backgroundSteps);
  state.background = task.background;

  if (state.fog !== task.fog) {
    await page.keyboard.press('Digit2');
    state.fog = task.fog;
  }
  if (state.shadows !== task.shadows) {
    await page.keyboard.press('Digit3');
    state.shadows = task.shadows;
  }

  const tierSteps = (REVIEW_TIER_ORDER.indexOf(task.tier) - REVIEW_TIER_ORDER.indexOf(state.tier) + REVIEW_TIER_ORDER.length) % REVIEW_TIER_ORDER.length;
  await cyclePress(page, 'Digit4', tierSteps);
  state.tier = task.tier;

  const lodSteps = (REVIEW_LOD_ORDER.indexOf(task.lodOverride) - REVIEW_LOD_ORDER.indexOf(state.lod) + REVIEW_LOD_ORDER.length) % REVIEW_LOD_ORDER.length;
  await cyclePress(page, 'Digit5', lodSteps);
  state.lod = task.lodOverride;

  const diagnosticSteps =
    (REVIEW_DIAGNOSTIC_ORDER.indexOf(task.diagnostic) - REVIEW_DIAGNOSTIC_ORDER.indexOf(state.diagnostic) + REVIEW_DIAGNOSTIC_ORDER.length) %
    REVIEW_DIAGNOSTIC_ORDER.length;
  await cyclePress(page, 'KeyK', diagnosticSteps);
  state.diagnostic = task.diagnostic;

  const viewSteps = (task.viewIndex - state.view + VIEW_COUNT) % VIEW_COUNT;
  await cyclePress(page, 'KeyN', viewSteps);
  state.view = task.viewIndex;
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

    // Group by viewport so we only reload/resize when it actually changes.
    let currentViewport: { width: number; height: number } | null = null;
    let page: Page | null = null;
    const state = {
      view: 0,
      background: 'sunset' as ReviewBackground,
      tier: 'desktopHigh' as ReviewTier,
      lod: 'auto' as ReviewLodOverride,
      diagnostic: 'none' as ReviewDiagnostic,
      fog: true,
      shadows: true,
      candidateIndex: 0,
      material: 'ivoryMarble' as ReviewMaterial,
    };

    for (const task of matrix) {
      try {
        const viewportChanged =
          !currentViewport || currentViewport.width !== task.viewport.width || currentViewport.height !== task.viewport.height;
        if (viewportChanged || !page) {
          if (page) await page.close();
          page = await browser.newPage({ viewport: task.viewport });
          await page.goto(BASE_URL, { waitUntil: 'networkidle' });
          await page.waitForSelector('canvas', { timeout: 15_000 });
          await page.waitForTimeout(1500); // let the scene mount + first sunT tick settle
          await page.keyboard.press('KeyB'); // enter review mode
          await page.waitForTimeout(200);
          currentViewport = task.viewport;
          state.view = 0;
          state.background = 'sunset';
          state.tier = 'desktopHigh';
          state.lod = 'auto';
          state.diagnostic = 'none';
          state.fog = true;
          state.shadows = true;
          state.candidateIndex = 0;
          state.material = 'ivoryMarble';
        }

        await applyConfig(page, task, state);
        await page.waitForTimeout(400); // let camera/config settle over a few frames

        const filePath = path.join(OUTPUT_DIR, task.filename);
        await page.screenshot({ path: filePath });
        generated.push(task.filename);
      } catch (error) {
        failed.push({ filename: task.filename, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    if (page) await page.close();
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
