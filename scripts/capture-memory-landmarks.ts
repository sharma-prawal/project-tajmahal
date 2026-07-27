import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

/**
 * Phase 10D.1 — photographs the memory landmark system.
 *
 * Two questions the normal environment capture cannot answer, because its
 * cameras are fixed and four of the five phases only exist while a player is
 * standing inside a volume:
 *
 * 1. Can a player tell the four states apart with no text?
 * 2. Does the landmark read at 40 m, 20 m, 10 m and 2 m?
 *
 * So: the same lamp, from four distances, in four states.
 */
const PORT = 5212;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/memory-landmarks');

/**
 * Shot on **m1's lamp in the NW quadrant**, at its corrected position
 * (-26.2, 0.012, -58).
 *
 * Two earlier targets were rejected by what came back:
 *
 * - m1 at its *original* position was inside a 14.8 m `plants-scene` group —
 *   every frame was a wall of leaves. That was a real placement bug, now fixed
 *   and pinned by a clearance test.
 * - m7's pair at the mausoleum door is hidden behind the plinth balustrade
 *   from anywhere on the platform, and sits white-marble-on-white-marble
 *   besides. Both are findings in their own right; neither makes a legibility
 *   test.
 *
 * This approach is from the open lawn to the south-east, which puts the dark
 * green planting group *behind* the lamp — the contrast a white marble object
 * needs, and the direction a player actually crosses this quadrant from.
 */
const LAMP = { x: -26.2, z: -58 };
/** Eye height, so every frame is what a standing player actually sees. */
const EYE = 1.7;

/**
 * Aim at the lamp's mid-height at every distance.
 *
 * An earlier version scaled the look-at height with distance, which pointed the
 * 2 m camera at the plinth and pushed the lamp head — the flame, the whole
 * point at close range — out of frame entirely.
 */
const LAMP_MID_Y = 0.85;

function cameraAt(distance: number) {
  const angle = Math.PI * 0.25;
  return {
    cam: `${(LAMP.x + Math.sin(angle) * distance).toFixed(2)},${EYE},${(LAMP.z - Math.cos(angle) * distance).toFixed(2)}`,
    look: `${LAMP.x},${LAMP_MID_Y},${LAMP.z}`,
  };
}

const DISTANCES = [40, 20, 10, 2] as const;
const STATES = ['idle', 'cued', 'revealing', 'complete'] as const;
const STATE_LABEL: Record<(typeof STATES)[number], string> = {
  idle: 'undiscovered', cued: 'nearby', revealing: 'active', complete: 'completed',
};

const problems: string[] = [];

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Landmark capture server did not start within 90s');
}

async function load(page: Page, distance: number) {
  const { cam, look } = cameraAt(distance);
  await page.addInitScript(() => {
    localStorage.removeItem('project-taj:save');
    localStorage.removeItem('project-taj:experience-settings');
  });
  await page.goto(`${BASE_URL}?cleanCapture=1&landmarkCam=${cam}&landmarkLook=${look}`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await page.waitForSelector('#root canvas', { timeout: 60_000 });
  await page.waitForTimeout(9000);
  if (await page.locator('#root canvas').count() < 1) {
    problems.push(`[${distance}m] canvas missing after warm-up`);
  }
  // The bridge is installed by a `useEffect` inside the canvas tree, so it can
  // exist a frame or two after the canvas does.
  await page.waitForFunction(() => '__tajLandmarkState' in window, { timeout: 30_000 })
    .catch(() => problems.push(`[${distance}m] __tajLandmarkState bridge never appeared`));
}

async function shoot(page: Page, filename: string, label: string) {
  await page.waitForTimeout(900);
  if (await page.locator('#root canvas').count() < 1) {
    problems.push(`[${label}] ${filename}: canvas absent at capture time`);
  }
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('#root > *').forEach((el) => {
      if (el.tagName !== 'CANVAS' && !el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
    document.querySelectorAll<HTMLElement>('.experience-hud, .camera-controls, #stats').forEach((el) => { el.style.visibility = 'hidden'; });
  });
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 120_000 });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let server: ChildProcess | undefined; let browser: Browser | undefined;
  try {
    server = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--strictPort'], {
      env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe',
    });
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message.split('\n')[0]}`));

    for (const distance of DISTANCES) {
      await load(page, distance);
      for (const state of STATES) {
        await page.evaluate(
          ([phase]) => (window as unknown as { __tajLandmarkState?: (p: string) => void }).__tajLandmarkState?.(phase),
          [state],
        );
        const filename = `${String(distance).padStart(2, '0')}m-${STATE_LABEL[state]}.png`;
        try { await shoot(page, filename, `${distance}m/${state}`); }
        catch (error) { problems.push(`[${distance}m/${state}] ${(error as Error).message.split('\n')[0]}`); }
      }
    }

    // One mobile frame at the distance the state has to read from on a phone.
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', (error) => problems.push(`[mobile] pageerror: ${error.message.split('\n')[0]}`));
    await load(mobile, 20);
    await mobile.evaluate(() => (window as unknown as { __tajLandmarkState?: (p: string) => void }).__tajLandmarkState?.('complete'));
    try { await shoot(mobile, 'mobile-20m-completed.png', 'mobile'); }
    catch (error) { problems.push(`[mobile] ${(error as Error).message.split('\n')[0]}`); }
    await mobileContext.close();

    await writeFile(
      path.join(OUTPUT_DIR, 'capture-validation.json'),
      `${JSON.stringify({
        measuredAt: new Date().toISOString(),
        environment: 'Playwright Chromium / SwiftShader; not physical-device validation',
        grid: { distances: DISTANCES, states: STATES.map((state) => STATE_LABEL[state]) },
        problems,
      }, null, 2)}\n`,
    );
    if (problems.length) console.warn(`Captured with ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    console.log(`Generated ${DISTANCES.length * STATES.length + 1} landmark captures in ${OUTPUT_DIR}${problems.length ? ' (see problems above)' : ' — clean'}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
