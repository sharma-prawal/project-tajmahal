import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { CaptureError, assertPortFree, spawnDevServer, startHeartbeat, step, waitForServer } from './capture-harness';

/**
 * Phase 10F.3 — every beat photographed at every line it makes the player read.
 *
 * The gap this closes: a memory's props are spawned by `world-action` steps,
 * and those steps are *transient* — the runtime executes them and moves on in
 * the same frame. Only `dialogue` steps block, waiting for input. So the only
 * instants a memory's composition is stable enough to photograph are its
 * dialogue lines, and those are also the only instants a player is actually
 * sitting there looking at it.
 *
 * `capture-canonical-journey.ts` shoots 2.2 s after activation, which is
 * always inside the opening camera move and before the first world-action.
 * Its `staged` frames are therefore all empty stages — which is why Boarding
 * Passes appeared to have no props and Friday Night appeared to be bare
 * ground. This shoots line by line instead, so "does the authored camera frame
 * this memory's own content?" becomes answerable by looking.
 *
 * Uses `?spawn=` deliberately: this is targeted follow-up validation of
 * composition, not a traversal measurement. Traversal lives in
 * `playtest-10f3.ts`, which walks.
 */
const PORT = 5234;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/playtest-10f3/composition');

interface Beat {
  order: number;
  id: string;
  productionId: string;
  /** Just inside the 6.2 m activation radius, on the beat's natural approach. */
  spawn: string;
}

const BEATS: readonly Beat[] = [
  { order: 1, id: 'mints', productionId: 'production.memory.mints', spawn: '-22,2,-60.5' },
  { order: 2, id: 'boarding-passes', productionId: 'production.memory.boarding-passes', spawn: '-24,2,-100.5' },
  { order: 3, id: 'little-details', productionId: 'production.memory.little-details', spawn: '-20,2,-121.5' },
  { order: 4, id: 'back', productionId: 'production.memory.back', spawn: '-38.3,2,-136' },
  { order: 5, id: 'umbrella', productionId: 'production.memory.umbrella', spawn: '38.3,2,-136' },
  { order: 6, id: 'friday-night', productionId: 'production.memory.friday-night', spawn: '18,2,-147.5' },
  { order: 7, id: 'all-day-call', productionId: 'production.memory.all-day-call', spawn: '-5.5,5.4,-172.5' },
];

const problems: string[] = [];
const timeline: Record<string, { stepId: string; kind: string; speaker: string | null; text: string | null; frame: string | null; msSincePrevious: number }[]> = {};

async function hideDebugPanels(page: Page) {
  await page.evaluate(`(function () {
    var all = document.querySelectorAll('body *');
    for (var i = 0; i < all.length; i += 1) {
      var el = all[i];
      if (getComputedStyle(el).position !== 'fixed') continue;
      if (el.querySelector('canvas')) continue;
      if (el.querySelector('.interaction-prompt') || el.querySelector('.memory-dialogue')) continue;
      if (el.matches('.interaction-prompt') || el.matches('.memory-dialogue')) continue;
      var text = el.textContent || '';
      if (/Press [A-Z] for|draw calls|shadow casters|fps:/.test(text)) el.style.visibility = 'hidden';
    }
    var fpsBadge = document.querySelector('canvas + canvas, body > canvas');
    if (fpsBadge && fpsBadge.width < 200) fpsBadge.style.visibility = 'hidden';
  })()`);
}

async function snapshot(page: Page) {
  return page.evaluate(`(function () {
    var runtime = window.__memoryRuntime;
    var snap = runtime ? runtime.getSnapshot() : null;
    var promptEl = document.querySelector('.interaction-prompt');
    return {
      activeMemoryId: snap ? snap.activeMemoryId : null,
      lifecycle: snap ? snap.lifecycle : 'idle',
      stepId: snap ? snap.stepId : null,
      stepIndex: snap ? snap.stepIndex : -1,
      pendingInput: snap ? snap.pendingInput : false,
      speaker: snap && snap.dialogue ? snap.dialogue.speaker : null,
      text: snap && snap.dialogue ? snap.dialogue.text : null,
      completed: runtime ? runtime.getCompletedIds() : [],
      prompt: promptEl ? (promptEl.textContent || '').trim() : null
    };
  })()`) as Promise<{ activeMemoryId: string | null; lifecycle: string; stepId: string | null; stepIndex: number; pendingInput: boolean; speaker: string | null; text: string | null; completed: string[]; prompt: string | null }>;
}

async function captureBeat(page: Page, beat: Beat) {
  const prefix = `${String(beat.order).padStart(2, '0')}-${beat.id}`;
  const rows: typeof timeline[string] = [];
  await page.goto(`${BASE_URL}?spawn=${beat.spawn}&cleanCapture=1`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('#root canvas', { timeout: 90_000 });
  for (let i = 0; i < 5; i += 1) {
    const skip = page.locator('button', { hasText: /^Skip$/ });
    if (await skip.count() === 0) break;
    await skip.first().click().catch(() => undefined);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(6_000);

  await hideDebugPanels(page);
  const approach = await snapshot(page);
  if (!approach.prompt) problems.push(`${beat.id}: no interaction prompt at its approach point`);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${prefix}-00-approach.png`), timeout: 120_000 });
  rows.push({ stepId: 'approach', kind: 'prompt', speaker: null, text: approach.prompt, frame: `${prefix}-00-approach.png`, msSincePrevious: 0 });

  await page.keyboard.press('KeyE');
  await page.waitForTimeout(2_500);
  if ((await snapshot(page)).activeMemoryId !== beat.productionId) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(2_500);
  }
  const active = await snapshot(page);
  if (active.activeMemoryId !== beat.productionId) {
    problems.push(`${beat.id}: E did not start the memory (lifecycle ${active.lifecycle})`);
    timeline[beat.id] = rows;
    return;
  }

  let line = 0;
  let lastStepId: string | null = null;
  let lastAt = Date.now();
  const guard = Date.now();
  while (Date.now() - guard < 300_000) {
    const state = await snapshot(page);
    // The runtime leaves `activeMemoryId` set after its `complete` step, so
    // completion — not a null id — is what ends a memory.
    if (state.completed.includes(beat.productionId)) break;
    if (state.activeMemoryId !== beat.productionId && line > 0) break;

    if (state.pendingInput && state.text && state.stepId !== lastStepId) {
      lastStepId = state.stepId;
      line += 1;
      // Let the world-action that preceded this line settle before shooting.
      await page.waitForTimeout(1_100);
      await hideDebugPanels(page);
      const frame = `${prefix}-${String(line).padStart(2, '0')}-${(state.stepId ?? 'line').slice(0, 30)}.png`;
      await page.screenshot({ path: path.join(OUTPUT_DIR, frame), timeout: 120_000 });
      rows.push({ stepId: state.stepId ?? 'line', kind: 'dialogue', speaker: state.speaker, text: state.text, frame, msSincePrevious: Date.now() - lastAt });
      lastAt = Date.now();
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(450);
    } else {
      await page.waitForTimeout(250);
    }
  }

  // The moment control comes back — what the player is looking at when they
  // regain the camera, and which way they are pointed.
  await page.waitForTimeout(2_500);
  await hideDebugPanels(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${prefix}-99-released.png`), timeout: 120_000 });
  const done = await snapshot(page);
  const telemetry = await page.evaluate('(function(){var t=window.__explorationTelemetry;return {yaw:t.yaw,pitch:t.pitch,x:t.x,z:t.z};})()') as { yaw: number; pitch: number; x: number; z: number };
  rows.push({
    stepId: 'released',
    kind: 'control-returned',
    speaker: null,
    text: `yaw ${telemetry.yaw.toFixed(2)} pitch ${telemetry.pitch.toFixed(2)} at (${telemetry.x.toFixed(1)}, ${telemetry.z.toFixed(1)}); prompt "${done.prompt ?? 'none'}"`,
    frame: `${prefix}-99-released.png`,
    msSincePrevious: Date.now() - lastAt,
  });
  if (!done.completed.includes(beat.productionId)) problems.push(`${beat.id}: did not complete`);
  timeline[beat.id] = rows;
  console.log(`${prefix}: ${line} dialogue lines captured, ${done.completed.includes(beat.productionId) ? 'completed' : 'DID NOT COMPLETE'}`);
}

async function main() {
  const only = process.argv.slice(2);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await assertPortFree(PORT);
  const stop = startHeartbeat('composition pass');
  let serverExited: number | null | undefined;
  const server = spawnDevServer(PORT, (code) => { serverExited = code; });
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
  });
  try {
    await step('dev server boot', 150_000, () => waitForServer(BASE_URL));
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => { localStorage.removeItem('project-taj:save'); localStorage.removeItem('project-taj:experience-settings'); });
    const page = await context.newPage();
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message.split('\n')[0]}`));

    for (const beat of BEATS) {
      if (serverExited !== undefined) throw new CaptureError('browser-lost', `dev server exited (${serverExited})`);
      if (only.length && !only.includes(beat.id)) continue;
      await step(`compose ${beat.id}`, 420_000, () => captureBeat(page, beat));
    }

    const outcome = problems.length ? 'completed-with-problems' : 'completed-clean';
    await writeFile(
      path.join(OUTPUT_DIR, 'composition-timeline.json'),
      `${JSON.stringify({ measuredAt: new Date().toISOString(), environment: 'headed Chromium / ANGLE Metal', outcome, timeline, problems }, null, 2)}\n`,
    );
    console.log(`\n=== composition pass: ${outcome} ===`);
    problems.forEach((problem) => console.log(`  ! ${problem}`));
  } finally {
    stop();
    await browser.close();
    server.kill();
  }
}

main().catch((error) => { console.error(error instanceof CaptureError ? error.message : error); process.exitCode = 1; });
