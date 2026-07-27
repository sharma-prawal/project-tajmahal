import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { assertPortFree, spawnDevServer, startHeartbeat, step, waitForServer } from './capture-harness';

/**
 * Phase 10F.3 — does the five-of-seven gate gate anything?
 *
 * The canonical run ended with the gate at 4 of 7, the door reading shut, and
 * the player standing at z = -216: the mausoleum's own centre, inside the
 * interior chamber. That is a large enough claim to deserve its own
 * reproduction from a save with **zero** memories completed, which is what
 * this does — spawn on the platform, walk north, and report where the player
 * ends up and what the gate said while they did it.
 *
 * Reported as measurement, not as a fix: whether the door should stop anyone
 * is a design decision, and 10F.3 is forbidden from changing the progression
 * rule. This only establishes what the rule currently *does*.
 */
const PORT = 5235;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/playtest-10f3/gate');

async function readState(page: Page) {
  return page.evaluate(`(function () {
    var runtime = window.__memoryRuntime;
    var t = window.__explorationTelemetry;
    var raw = localStorage.getItem('project-taj:save');
    var save = null;
    try { save = raw ? JSON.parse(raw) : null; } catch (error) { save = null; }
    var spine = save && save.completedMemoryIds ? save.completedMemoryIds : [];
    var production = runtime ? runtime.getCompletedIds() : [];
    var promptEl = document.querySelector('.interaction-prompt');
    return {
      x: t.x, y: t.y, z: t.z,
      spine: spine,
      production: production,
      gate: Math.max(spine.length, production.length),
      schemaVersion: save ? save.schemaVersion : null,
      prompt: promptEl ? (promptEl.textContent || '').trim() : null
    };
  })()`) as Promise<{ x: number; y: number; z: number; spine: string[]; production: string[]; gate: number; schemaVersion: number | null; prompt: string | null }>;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await assertPortFree(PORT);
  const stop = startHeartbeat('gate reproduction');
  const server = spawnDevServer(PORT, () => undefined);
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
  });
  const findings: Record<string, unknown> = {};
  try {
    await step('dev server boot', 150_000, () => waitForServer(BASE_URL));
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => { localStorage.clear(); });
    const page = await context.newPage();

    // Spawn on the platform top, on the axis, well south of the door.
    await page.goto(`${BASE_URL}?spawn=0,5.4,-180`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForSelector('#root canvas', { timeout: 90_000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __explorationTelemetry?: unknown }).__explorationTelemetry), null, { timeout: 90_000 });
    for (let i = 0; i < 5; i += 1) {
      const skip = page.locator('button', { hasText: /^Skip$/ });
      if (await skip.count() === 0) break;
      await skip.first().click().catch(() => undefined);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(5_000);

    const before = await readState(page);
    findings.before = before;
    console.log(`before: gate ${before.gate}/5, spine [${before.spine.join(',')}], production [${before.production.join(',')}], at z=${before.z.toFixed(1)}`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01-platform-zero-progress.png') });

    // Walk north in 4 s slices, sampling, until we stop making progress or
    // pass the Taj's rear wall.
    const track: { z: number; gate: number; prompt: string | null }[] = [];
    await page.keyboard.down('KeyW');
    for (let i = 0; i < 12; i += 1) {
      await page.waitForTimeout(3_000);
      const sample = await readState(page);
      track.push({ z: Number(sample.z.toFixed(1)), gate: sample.gate, prompt: sample.prompt });
      if (sample.z < -225) break;
    }
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(1_000);

    const after = await readState(page);
    findings.track = track;
    findings.after = after;
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02-after-walking-north.png') });

    const tajFrontFace = -194.5;
    const enteredBuilding = after.z < tajFrontFace;
    findings.tajFrontFaceZ = tajFrontFace;
    findings.enteredWithZeroMemories = enteredBuilding;
    console.log(`after: z=${after.z.toFixed(1)}, gate ${after.gate}/5`);
    console.log(`track: ${track.map((row) => `z=${row.z}`).join(' -> ')}`);
    console.log(enteredBuilding
      ? `RESULT: with ${after.production.length} narratives and ${after.spine.length} landmarks complete (gate ${after.gate}/5 — SHUT), the player walked past the Taj's front face (z=${tajFrontFace}) to z=${after.z.toFixed(1)}.`
      : `RESULT: the player was stopped at z=${after.z.toFixed(1)}, north of the front face at ${tajFrontFace}.`);

    await writeFile(path.join(OUTPUT_DIR, 'gate-reproduction.json'), `${JSON.stringify({ measuredAt: new Date().toISOString(), findings }, null, 2)}\n`);
  } finally {
    stop();
    await browser.close();
    server.kill();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
