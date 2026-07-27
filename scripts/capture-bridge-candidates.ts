import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { AXIS_LAYOUT, PLATFORM } from '../src/constants/world';
import { CaptureError, assertPortFree, spawnDevServer, startHeartbeat, step, waitForServer } from './capture-harness';

/**
 * Phase 10F.2 — photographs candidate bridge locations from the route a
 * player actually walks.
 *
 * Choosing five bridge positions from a plan view is the same class of
 * reasoning Phases 10E-10F.1 spent their whole length refusing: a number that
 * looks right on a grid and has never been seen. So each candidate is shot
 * from its natural approach bearing at standing eye height, with the review
 * overlay drawing its activation ring and the spine volumes around it.
 *
 * Two frames per candidate:
 *   `approach` — 12 m out on the approach bearing: is it findable? does it
 *                read as deliberate, or as scenery?
 *   `arrival`  — 3 m out: is there room? what is behind it? is the ground
 *                clear, or is this a path/planting/water?
 *
 * Deliberately *not* cinematic: no framing is chosen to flatter a candidate.
 * A position that only works from a hand-picked angle has not been proven.
 */
const PORT = 5216;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/bridge-candidates');
const EYE = 1.7;

interface Candidate {
  /** `<bridge>-<letter>`, so files sort into per-bridge groups. */
  id: string;
  x: number;
  z: number;
  /** Compass bearing the player arrives from, radians; 0 = from +Z (the gate). */
  approach: number;
  note: string;
}

/**
 * Candidates are grouped per bridge. Positions come from the geometry the
 * world actually has — planting footprints, path widths, pool kerb, platform
 * extent, minaret insets — not from a uniform grid.
 */
const CANDIDATES: readonly Candidate[] = [
  // ---- Second pass. The first pass photographed sixteen positions; these are
  // the survivors plus the one idea it forced.
  //
  // What the first pass settled: all four m6 *platform-top* candidates came
  // back as featureless open marble with the mausoleum filling the frame —
  // the "centre of open marble" Step 8 forbids, and the opposite of the
  // privacy Friday Night needs. The platform's only vertical elements are its
  // perimeter balustrade, four corner minarets and the Taj itself.
  //
  // So: the foot of the platform instead of its top. Standing just north of
  // the plinth's north face (z=-154) puts a 3.2 m sandstone wall immediately
  // behind the player, inside m6's 24 m volume, off the stair route, with the
  // Taj rising *above* the wall rather than flat ahead.
  { id: 'friday-H', x: 18, z: -152, approach: 0.3, note: 'E foot of the platform, back to the plinth wall' },
  { id: 'friday-L', x: 14, z: -152, approach: 0.3, note: 'as H but nearer the axis' },
  { id: 'friday-J', x: -18, z: -152, approach: -0.3, note: 'W mirror of H' },
  // Retained from pass one as the comparison these three must beat.
  { id: 'friday-G', x: 17, z: -172, approach: 0.3, note: 'platform top — open marble, for comparison' },

  // Confirmed in pass one; re-shot here for a consistent set.
  { id: 'mints-D', x: -22, z: -65, approach: 0.3, note: 'SE of the m1 chirag, lawn, tree framing, planting backdrop' },
  { id: 'boarding-D', x: -24, z: -105, approach: 0.2, note: 'S of the m2 chirag, lawn, chattri and bench in the middle distance' },
  { id: 'little-A', x: -20, z: -126, approach: 0.9, note: 'existing Phase 7 anchor at the west pool edge' },
  { id: 'allday-D', x: -5.5, z: -177, approach: -0.15, note: 'final approach, cadence toward the door' },
];





/** Every candidate drawn at once, so each frame shows its neighbours too. */
const OVERLAY = CANDIDATES.map((candidate) => `${candidate.id}:${candidate.x},${candidate.z}`).join('|');

const problems: string[] = [];

/**
 * Eye height is measured from the ground the camera actually stands on. The
 * first pass used a flat 1.7 for every candidate, which put the camera 1.5 m
 * *inside* the platform slab for all four Friday Night positions — a frame
 * that would have shown the underside of the marble and been read as "this
 * location is dark and enclosed".
 *
 * Derived from `world.ts` directly rather than from
 * `bridgePlacement.groundHeightAt`: that module imports `@constants/world`
 * by alias, and `tsx` does not apply tsconfig paths at runtime (the same
 * limitation Phase 10E.2 hit). `world.ts` has no imports of its own, so the
 * script consumes it the way `capture-bakeoff` consumes `reviewConfig` — by
 * relative path, with no duplicated numbers.
 */
const groundHeightAt = (z: number) => (z <= AXIS_LAYOUT.stairsEnd ? PLATFORM.height : 0);
function cameraFor(candidate: Candidate, distance: number) {
  const x = candidate.x + Math.sin(candidate.approach) * distance;
  const z = candidate.z + Math.cos(candidate.approach) * distance;
  const eyeY = groundHeightAt(z) + EYE;
  const lookY = groundHeightAt(candidate.z) + 1.1;
  return { cam: [x, eyeY, z], look: [candidate.x, lookY, candidate.z] };
}

/**
 * One page load serves every frame.
 *
 * The first two runs reloaded per frame (~8 s warm-up x 37) and one of them
 * outlived the machine staying awake — the harness reported a `step-timeout`
 * after a 1000-second heartbeat gap, which is the failure it exists to name.
 * Repositioning through `window.__tajBridgeCam` instead turns each frame into
 * about a second.
 */
async function load(page: Page) {
  const url = `${BASE_URL}?cleanCapture=1&bridgeCandidates=${encodeURIComponent(OVERLAY)}`
    + '&showVolumes=1&showAnchors=1&reviewLabels=0';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('#root canvas', { timeout: 60_000 });
  await page.waitForTimeout(9000);
  // Polled with `evaluate` rather than `waitForFunction`. Both forms were
  // tried and `waitForFunction` timed out for 30 s while a diagnostic
  // `evaluate` in the same page reported `__tajBridgeCam` already present —
  // its predicate never got a turn against R3F's render loop, with either
  // rAF or interval polling. `evaluate` is scheduled like any other CDP call
  // and is unaffected.
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    ready = await page.evaluate(() => '__tajBridgeCam' in window);
    if (ready) break;
    await page.waitForTimeout(500);
  }
  if (!ready) throw new CaptureError('step-timeout', 'the bridge review camera hook never appeared');
  await hideDebugHud(page);
}

/**
 * Every dev HUD here is a `position: fixed` div outside the canvas. Hiding by
 * class name missed all of them; hiding by computed position catches them.
 *
 * Re-run before **every** screenshot, not once at load: these panels
 * re-render on their own (the stats panel updates per frame), which restores
 * their visibility and put the perf readout back into the first batch of
 * frames.
 */
async function hideDebugHud(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      if (getComputedStyle(el).position === 'fixed' && !el.querySelector('canvas')) {
        el.style.visibility = 'hidden';
      }
    });
  });
}

async function shoot(page: Page, candidate: Candidate, distance: number, suffix: string) {
  const { cam, look } = cameraFor(candidate, distance);
  await page.evaluate(
    ([position, lookAt]) =>
      (window as unknown as {
        __tajBridgeCam?: (p: number[], l: number[]) => void;
      }).__tajBridgeCam?.(position, lookAt),
    [cam, look],
  );
  await page.waitForTimeout(700);
  await hideDebugHud(page);
  if ((await page.locator('#root canvas').count()) < 1) {
    problems.push(`${candidate.id}/${suffix}: canvas missing`);
    return;
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${candidate.id}-${suffix}.png`), timeout: 120_000 });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await assertPortFree(PORT);
  const stopHeartbeat = startHeartbeat('bridge-candidate captures');
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

    await step('scene warm-up', 180_000, () => load(page));
    for (const candidate of CANDIDATES) {
      if (serverExited !== undefined) throw new CaptureError('browser-lost', `dev server exited (${serverExited})`);
      await step(`${candidate.id} approach`, 60_000, () => shoot(page, candidate, 12, 'approach'));
      await step(`${candidate.id} arrival`, 60_000, () => shoot(page, candidate, 3, 'arrival'));
    }

    // One mobile frame per bridge — the aspect ratio that actually decides
    // whether a small prop reads.
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', (error) => problems.push(`[mobile] pageerror: ${error.message.split('\n')[0]}`));
    await step('mobile warm-up', 180_000, () => load(mobile));
    for (const id of ['mints-D', 'boarding-D', 'little-A', 'friday-H', 'allday-D']) {
      const candidate = CANDIDATES.find((entry) => entry.id === id)!;
      await step(`${id} mobile`, 60_000, () => shoot(mobile, candidate, 5, 'mobile'));
    }
    await mobileContext.close();

    await writeFile(
      path.join(OUTPUT_DIR, 'capture-validation.json'),
      `${JSON.stringify({
        measuredAt: new Date().toISOString(),
        environment: 'Playwright Chromium / SwiftShader; not physical-device validation',
        outcome: problems.length ? 'completed-with-problems' : 'completed-clean',
        candidates: CANDIDATES,
        problems,
      }, null, 2)}\n`,
    );
    console.log(
      `Captured ${CANDIDATES.length * 2 + 5} bridge-candidate frames in ${OUTPUT_DIR}`
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
