import { chromium, type Page } from 'playwright';
import { assertPortFree, spawnDevServer, waitForServer } from './capture-harness';

/**
 * Phase 10F.3 — is the mausoleum's missing collision specific, or general?
 *
 * The gate reproduction showed a player walking from z = -180 to z = -226.6,
 * straight through the Taj. Before calling that a defect in one component, it
 * has to be separated from "fixed colliders do not work at all here". Each
 * probe walks into one piece of architecture for 10 s and reports whether it
 * stopped the player.
 */
const PORT = 5236;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const PROBES = [
  { id: 'platform-south-wall', spawn: '18,0.9,-150', key: 'KeyW', expectBlockedAxis: 'z', note: 'the 3.2 m plinth wall beside Friday Night' },
  { id: 'entrance-gate-solid', spawn: '-14,0.9,-18', key: 'KeyW', expectBlockedAxis: 'z', note: 'the gate building, off-arch' },
  { id: 'mausoleum-front', spawn: '0,5.4,-190', key: 'KeyW', expectBlockedAxis: 'z', note: 'the Taj front face on the axis' },
  { id: 'mausoleum-front-offset', spawn: '-12,5.4,-190', key: 'KeyW', expectBlockedAxis: 'z', note: 'the Taj front face away from the door opening' },
  { id: 'garden-boundary-west', spawn: '-50,0.9,-80', key: 'KeyA', expectBlockedAxis: 'x', note: 'the outer boundary wall' },
] as const;

async function pos(page: Page) {
  return page.evaluate('(function(){var t=window.__explorationTelemetry;return {x:t.x,y:t.y,z:t.z};})()') as Promise<{ x: number; y: number; z: number }>;
}

async function main() {
  await assertPortFree(PORT);
  const server = spawnDevServer(PORT, () => undefined);
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
  });
  try {
    await waitForServer(BASE_URL);
    const context = await browser.newContext({ viewport: { width: 900, height: 600 } });
    await context.addInitScript(() => { localStorage.clear(); });
    const page = await context.newPage();
    for (const probe of PROBES) {
      await page.goto(`${BASE_URL}?spawn=${probe.spawn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForSelector('#root canvas', { timeout: 90_000 });
      await page.waitForFunction(() => Boolean((window as unknown as { __explorationTelemetry?: unknown }).__explorationTelemetry), null, { timeout: 90_000 });
      for (let i = 0; i < 5; i += 1) {
        const skip = page.locator('button', { hasText: /^Skip$/ });
        if (await skip.count() === 0) break;
        await skip.first().click().catch(() => undefined);
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(4_500);
      const before = await pos(page);
      await page.keyboard.down(probe.key);
      await page.waitForTimeout(10_000);
      await page.keyboard.up(probe.key);
      await page.waitForTimeout(600);
      const after = await pos(page);
      const moved = probe.expectBlockedAxis === 'z' ? Math.abs(after.z - before.z) : Math.abs(after.x - before.x);
      console.log(
        `${probe.id.padEnd(26)} ${probe.note}\n`
        + `  (${before.x.toFixed(1)}, ${before.z.toFixed(1)}) -> (${after.x.toFixed(1)}, ${after.z.toFixed(1)})`
        + `  moved ${moved.toFixed(1)} m in 10 s  =>  ${moved < 6 ? 'BLOCKED' : 'PASSED THROUGH'}`,
      );
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
