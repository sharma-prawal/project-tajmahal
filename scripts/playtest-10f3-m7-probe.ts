import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { assertPortFree, spawnDevServer, startHeartbeat, waitForServer } from './capture-harness';

/**
 * Phase 10F.3/11 — what does m7 say and show while locked, ready, and entered?
 *
 * Step 12 asks whether a player understands the door is available. The
 * canonical run could not answer it: its m7 sample was taken at z = -190,
 * which is 8.7 m from m7's centre and outside its 6 m radius, so it read no
 * prompt at all. This stands inside the volume instead, once with an empty
 * save and once with the gate already satisfied, and reports the difference a
 * player would be able to see.
 */
const PORT = 5237;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/playtest-10f3/m7');
const M7_SPAWN = '0,5.4,-190';

async function hideDebugPanels(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('body *').forEach((element) => {
      if (getComputedStyle(element).position !== 'fixed') return;
      if (element.matches('.interaction-prompt') || element.querySelector('.interaction-prompt')) return;
      if (/Press [A-Z] for|draw calls|shadow casters|fps:/.test(element.textContent ?? '')) {
        element.style.visibility = 'hidden';
      }
    });
  });
}

async function readState(page: Page) {
  return page.evaluate(`(function () {
    var raw = localStorage.getItem('project-taj:save');
    var save = null; try { save = raw ? JSON.parse(raw) : null; } catch (error) { save = null; }
    var spine = save && save.completedMemoryIds ? save.completedMemoryIds : [];
    var production = save && save.runtimeCompletedMemoryIds ? save.runtimeCompletedMemoryIds : [];
    var t = window.__explorationTelemetry;
    var promptEl = document.querySelector('.interaction-prompt');
    return {
      z: t.z,
      spine: spine,
      production: production,
      gate: Math.max(spine.length, production.length),
      prompt: promptEl ? (promptEl.textContent || '').trim() : null,
      bodyText: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 400)
    };
  })()`) as Promise<{ z: number; spine: string[]; production: string[]; gate: number; prompt: string | null; bodyText: string }>;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await assertPortFree(PORT);
  const stop = startHeartbeat('m7 threshold probe');
  const server = spawnDevServer(PORT, () => undefined);
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
  });
  const results: Record<string, unknown> = {};
  try {
    await waitForServer(BASE_URL);

    for (const scenario of ['locked', 'unlocked', 'entered'] as const) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      // "unlocked" writes a save with five narratives already complete — the
      // five-of-seven state a canonical player reaches at beat 5.
      const seeded = scenario !== 'locked';
      const entered = scenario === 'entered';
      await context.addInitScript(`(function () {
        localStorage.clear();
        if (${seeded}) {
          localStorage.setItem('project-taj:save', JSON.stringify({
            schemaVersion: 3, currentBeat: 'garden', persistedStoryFloor: 0,
            completedMemoryIds: [], completedInteractionIds: ${entered ? "['finale.mausoleum-gate']" : '[]'}, discoveredInteractionIds: [],
            lastCheckpoint: { x: 0, y: 5.4, z: -195 }, reducedMotion: false, audioMuted: false,
            interactionDistanceScale: 1, highContrastPrompts: false,
            runtimeCompletedMemoryIds: [
              'production.memory.mints', 'production.memory.boarding-passes',
              'production.memory.little-details', 'production.memory.back',
              'production.memory.umbrella'
            ],
            memoryFlags: [], activeMemoryCheckpoint: null, savedAt: new Date().toISOString()
          }));
        }
      })()`);
      const page = await context.newPage();
      await page.goto(`${BASE_URL}?spawn=${M7_SPAWN}&cleanCapture=1`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForSelector('#root canvas', { timeout: 90_000 });
      await page.waitForFunction(() => Boolean((window as unknown as { __explorationTelemetry?: unknown }).__explorationTelemetry), null, { timeout: 90_000 });
      for (let i = 0; i < 5; i += 1) {
        const skip = page.locator('button', { hasText: /^Skip$/ });
        if (await skip.count() === 0) break;
        await skip.first().click().catch(() => undefined);
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(8_000);
      await hideDebugPanels(page);
      const state = await readState(page);
      results[scenario] = state;
      console.log(`\n[${scenario}] z=${state.z.toFixed(1)} gate=${state.gate}/5 prompt=${state.prompt ? `"${state.prompt}"` : 'NONE'}`);
      console.log(`  production: [${state.production.join(', ') || 'none'}]  spine: [${state.spine.join(', ') || 'none'}]`);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `m7-threshold-${scenario}.png`) });
      await context.close();
    }

    await writeFile(path.join(OUTPUT_DIR, 'm7-threshold.json'), `${JSON.stringify({ measuredAt: new Date().toISOString(), spawn: M7_SPAWN, results }, null, 2)}\n`);
  } finally {
    stop();
    await browser.close();
    server.kill();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
