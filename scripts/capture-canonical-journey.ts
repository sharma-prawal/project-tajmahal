import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { CaptureError, assertPortFree, spawnDevServer, startHeartbeat, step, waitForServer } from './capture-harness';

/**
 * Phase 10F.2 — walks the canonical journey in order and photographs it from
 * the player's own position.
 *
 * These are not review frames: the overlay is off, the props are the real
 * ones, and every shot is taken standing where a player stands, with the
 * prompt the player would actually see. Two per beat:
 *
 *   `approach` — in range, prompt visible, before activating.
 *   `staged`   — the authored camera composition, once the memory owns it.
 *
 * The point is to be able to answer "is this the approved emotional journey?"
 * by looking, rather than by reading coordinates back to oneself.
 */
const PORT = 5222;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/canonical-journey');

interface Beat {
  order: number;
  id: string;
  /** Approach point, ~4.5 m out — inside the activation radius. */
  spawn: string;
}

/** Journey A, in the approved order. Spawns match the staged bridge anchors. */
const BEATS: readonly Beat[] = [
  { order: 1, id: 'mints', spawn: '-22,2,-60.5' },
  { order: 2, id: 'boarding-passes', spawn: '-24,2,-100.5' },
  { order: 3, id: 'little-details', spawn: '-20,2,-120.5' },
  { order: 4, id: 'back', spawn: '-38.3,2,-136' },
  { order: 5, id: 'umbrella', spawn: '38.3,2,-136' },
  { order: 6, id: 'friday-night', spawn: '18,2,-147.5' },
  { order: 7, id: 'all-day-call', spawn: '-5.5,5.4,-172.5' },
];

/** The threshold the journey hands over to, in both of its readable states. */
const M7_VIEWPOINTS = [
  { id: 'm7-approach', spawn: '0,5.4,-186' },
  { id: 'm7-threshold', spawn: '0,5.4,-193' },
] as const;

const problems: string[] = [];

async function hideDebugHud(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      if (getComputedStyle(el).position === 'fixed' && !el.querySelector('canvas')) {
        el.style.visibility = 'hidden';
      }
    });
  });
}

async function spawnAt(page: Page, spawn: string) {
  await page.goto(`${BASE_URL}?spawn=${spawn}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('#root canvas', { timeout: 60_000 });
  await page.waitForTimeout(7500);
}

async function shoot(page: Page, filename: string, { keepHud = false } = {}) {
  if ((await page.locator('#root canvas').count()) < 1) {
    problems.push(`${filename}: canvas missing`);
    return;
  }
  // The prompt is part of what a player sees, so `approach` frames keep the
  // interaction HUD and hide only the developer panels.
  if (!keepHud) await hideDebugHud(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 120_000 });
}

async function captureBeat(page: Page, beat: Beat) {
  const prefix = `${String(beat.order).padStart(2, '0')}-${beat.id}`;
  await spawnAt(page, beat.spawn);

  const text = await page.evaluate(() => document.body.innerText);
  if (!/Remember|Replay/.test(text)) {
    problems.push(`${beat.id}: no interaction prompt at its staged approach point`);
  }
  await shoot(page, `${prefix}-approach.png`, { keepHud: true });

  // Activate and let the authored camera settle into its composition.
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(2200);
  await shoot(page, `${prefix}-staged.png`, { keepHud: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await assertPortFree(PORT);
  const stopHeartbeat = startHeartbeat('canonical-journey captures');
  let browser: Browser | undefined;
  let serverExited: number | null | undefined;
  const server = spawnDevServer(PORT, (code) => { serverExited = code; });

  try {
    await step('dev server boot', 120_000, () => waitForServer(BASE_URL));
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message.split('\n')[0]}`));
    await page.addInitScript(() => {
      localStorage.removeItem('project-taj:save');
      localStorage.removeItem('project-taj:experience-settings');
    });

    for (const beat of BEATS) {
      if (serverExited !== undefined) throw new CaptureError('browser-lost', `dev server exited (${serverExited})`);
      await step(`beat ${beat.order} ${beat.id}`, 180_000, () => captureBeat(page, beat));
    }

    for (const viewpoint of M7_VIEWPOINTS) {
      await step(viewpoint.id, 180_000, async () => {
        await spawnAt(page, viewpoint.spawn);
        await shoot(page, `08-${viewpoint.id}.png`, { keepHud: true });
      });
    }

    // One mobile frame at the opening and one at the culmination — the two
    // beats whose props are smallest and largest respectively.
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', (error) => problems.push(`[mobile] pageerror: ${error.message.split('\n')[0]}`));
    await mobile.addInitScript(() => localStorage.removeItem('project-taj:save'));
    for (const beat of [BEATS[0], BEATS[6]]) {
      await step(`mobile ${beat.id}`, 180_000, async () => {
        await spawnAt(mobile, beat.spawn);
        await shoot(mobile, `mobile-${beat.id}.png`, { keepHud: true });
      });
    }
    await mobileContext.close();

    await writeFile(
      path.join(OUTPUT_DIR, 'capture-validation.json'),
      `${JSON.stringify({
        measuredAt: new Date().toISOString(),
        environment: 'Playwright Chromium / SwiftShader; not physical-device validation',
        outcome: problems.length ? 'completed-with-problems' : 'completed-clean',
        beats: BEATS,
        problems,
      }, null, 2)}\n`,
    );
    console.log(
      `Captured the canonical journey in ${OUTPUT_DIR}`
      + `${problems.length ? ` — ${problems.length} problem(s):\n  ${problems.join('\n  ')}` : ' — completed-clean'}`,
    );
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
