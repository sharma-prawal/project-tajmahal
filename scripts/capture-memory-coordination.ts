import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import {
  CaptureError,
  assertPortFree,
  spawnDevServer,
  startHeartbeat,
  step,
  waitForServer,
} from './capture-harness';

/**
 * Phase 10E.1 — the seven frames the brief asks for.
 *
 * Covers what unit tests cannot: that the m7 pair is actually visible from a
 * normal approach, that the vertical state band separates unexplored from
 * completed at 20 m and 10 m, and that a System B sequence running while the
 * player stands inside a System A volume takes ownership and releases it.
 *
 * (Distinct from the Phase 7 `capture-memory-runtime.ts`, which regression-shoots
 * one production memory's dialogue flow.)
 */
const PORT = 5214;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/memory-coordination');

/** m1's lamp, on open lawn with dark planting behind it — the readability case. */
const GARDEN_LAMP = { x: -26.2, z: -58 };
const EYE = 1.7;

function gardenView(distance: number) {
  const angle = Math.PI * 0.25;
  return {
    landmarkCam: `${(GARDEN_LAMP.x + Math.sin(angle) * distance).toFixed(2)},${EYE},${(GARDEN_LAMP.z - Math.cos(angle) * distance).toFixed(2)}`,
    landmarkLook: `${GARDEN_LAMP.x},0.85,${GARDEN_LAMP.z}`,
  };
}

/** Walking up the axis onto the platform, which is how every player meets m7. */
const M7_APPROACH = { landmarkCam: '0,4.9,-186', landmarkLook: '0,4.0,-197.5' };

interface Shot {
  name: string;
  params: Record<string, string>;
  state: 'idle' | 'complete' | null;
}

const SHOTS: Shot[] = [
  { name: '01-m7-normal-approach.png', params: M7_APPROACH, state: 'idle' },
  { name: '02-m7-normal-approach-completed.png', params: M7_APPROACH, state: 'complete' },
  { name: '03-unexplored-20m.png', params: gardenView(20), state: 'idle' },
  { name: '04-completed-20m.png', params: gardenView(20), state: 'complete' },
  { name: '05-unexplored-10m.png', params: gardenView(10), state: 'idle' },
  { name: '06-completed-10m.png', params: gardenView(10), state: 'complete' },
];

const problems: string[] = [];

async function load(page: Page, params: Record<string, string>, label: string) {
  const query = new URLSearchParams({ cleanCapture: '1', ...params }).toString();
  await step(`${label}: goto`, 90_000, () =>
    page.goto(`${BASE_URL}?${query}`, { waitUntil: 'domcontentloaded', timeout: 60_000 }));
  await step(`${label}: canvas`, 90_000, () => page.waitForSelector('#root canvas', { timeout: 60_000 }));
  await page.waitForTimeout(9000);
  if ((await page.locator('#root canvas').count()) < 1) {
    throw new CaptureError('browser-lost', `${label}: canvas vanished after warm-up`);
  }
  await step(`${label}: bridge`, 40_000, () =>
    page.waitForFunction(() => '__tajLandmarkState' in window, { timeout: 30_000 }));
}

async function shoot(page: Page, filename: string) {
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('#root > *').forEach((el) => {
      if (el.tagName !== 'CANVAS' && !el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
    document.querySelectorAll<HTMLElement>('.experience-hud, .camera-controls, #stats').forEach((el) => {
      el.style.visibility = 'hidden';
    });
  });
  await step(`screenshot ${filename}`, 150_000, () =>
    page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 120_000 }));
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await assertPortFree(PORT);

  const stopHeartbeat = startHeartbeat('memory-coordination capture');
  let serverExited: number | null | undefined;
  const server = spawnDevServer(PORT, (code) => { serverExited = code; });
  let browser: Browser | undefined;

  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      localStorage.removeItem('project-taj:save');
      localStorage.removeItem('project-taj:experience-settings');
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message.split('\n')[0]}`));
    page.on('crash', () => problems.push('page crashed'));

    for (const shot of SHOTS) {
      if (serverExited !== undefined) {
        throw new CaptureError('browser-lost', `dev server exited early (code ${serverExited})`);
      }
      await load(page, shot.params, shot.name);
      if (shot.state) {
        await page.evaluate(
          ([phase]) => (window as unknown as { __tajLandmarkState?: (p: string) => void }).__tajLandmarkState?.(phase),
          [shot.state],
        );
      }
      await shoot(page, shot.name);
      console.log(`  ok ${shot.name}`);
    }

    // The runtime-coordination frame: a production sequence taking ownership
    // while the player stands inside a System A volume, then releasing it.
    await load(page, gardenView(10), 'cutscene');
    const coordination = await step('coordination probe', 60_000, () => page.evaluate(() => {
      const w = window as unknown as {
        __memoryRuntime?: {
          activate: (id: string) => boolean;
          getSnapshot: () => { lifecycle: string; activeMemoryId: string | null };
          getOwnership: () => Record<string, string | null>;
          cancel: (reason?: string) => boolean;
        };
      };
      if (!w.__memoryRuntime) return { available: false as const };
      const started = w.__memoryRuntime.activate('production.memory.back');
      const during = {
        lifecycle: w.__memoryRuntime.getSnapshot().lifecycle,
        ownership: w.__memoryRuntime.getOwnership(),
      };
      const cancelled = w.__memoryRuntime.cancel('capture');
      return {
        available: true as const,
        started,
        during,
        cancelled,
        after: {
          lifecycle: w.__memoryRuntime.getSnapshot().lifecycle,
          ownership: w.__memoryRuntime.getOwnership(),
        },
      };
    }));
    await shoot(page, '07-cutscene-inside-volume.png');
    console.log('  ok 07-cutscene-inside-volume.png');

    await writeFile(
      path.join(OUTPUT_DIR, 'capture-validation.json'),
      `${JSON.stringify({
        measuredAt: new Date().toISOString(),
        environment: 'Playwright Chromium / SwiftShader; not physical-device validation',
        captures: [...SHOTS.map((shot) => shot.name), '07-cutscene-inside-volume.png'],
        coordination,
        problems,
        outcome: problems.length ? 'completed-with-problems' : 'completed-clean',
      }, null, 2)}\n`,
    );
    if (problems.length) console.warn(`Captured with ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    console.log(`Generated ${SHOTS.length + 1} coordination captures in ${OUTPUT_DIR}${problems.length ? ' (see problems)' : ' — clean'}`);
  } catch (error) {
    // Explicit outcome on disk, so a failed run is never mistaken for a slow one.
    const failure = error instanceof CaptureError ? error.failure : 'unknown';
    await writeFile(
      path.join(OUTPUT_DIR, 'capture-validation.json'),
      `${JSON.stringify({
        measuredAt: new Date().toISOString(),
        outcome: 'failed',
        failure,
        message: error instanceof Error ? error.message : String(error),
        problems,
      }, null, 2)}\n`,
    ).catch(() => {});
    throw error;
  } finally {
    stopHeartbeat();
    if (browser) await browser.close();
    server.kill();
  }
}

run().catch((error) => {
  console.error(error instanceof CaptureError ? error.message : error);
  process.exitCode = 1;
});
