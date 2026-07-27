import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
const PORT = 5206;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT = path.resolve('artifacts/review/benchmark/memory-friday-night.json');
type Sample = {
  fps: number;
  drawCalls: number;
  triangles: number;
  programs: number;
  geometries: number;
  textures: number;
  shadowCasters: number;
  jsHeapMB: number | null;
  dpr: number;
  gpuRenderer: string | null;
};
async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try {
      if ((await fetch(BASE_URL)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Memory benchmark server did not start');
}
async function run() {
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' },
      stdio: 'pipe',
    });
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => localStorage.removeItem('project-taj:save'));
    await page.goto(`${BASE_URL}?spawn=-28.5,2,-159`, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(5000);
    const focused = await page
      .getByRole('button', { name: 'Remember Friday Night' })
      .waitFor({ timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (focused) await page.keyboard.press('KeyE');
    else {
      const activated = await page.evaluate(
        () =>
          (
            window as unknown as { __memoryRuntime?: { activate: (id: string) => boolean } }
          ).__memoryRuntime?.activate('production.memory.friday-night') ?? false,
      );
      if (!activated) throw new Error('Friday Night benchmark activation failed');
    }
    await page.waitForTimeout(3100);
    await page.getByRole('dialog', { name: 'Memory narration' }).waitFor();
    const inactive = await page.evaluate(
      () => (window as unknown as { __perfSample?: Sample }).__perfSample ?? null,
    );
    if (!inactive) throw new Error('Missing inactive sample');
    for (let index = 0; index < 5; index += 1) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(180);
    }
    await page
      .getByText('What mattered was the trust it must have taken...', { exact: true })
      .waitFor();
    await page.waitForTimeout(1800);
    const activeStage3 = await page.evaluate(
      () => (window as unknown as { __perfSample?: Sample }).__perfSample ?? null,
    );
    if (!activeStage3) throw new Error('Missing active sample');
    const report = {
      measuredAt: new Date().toISOString(),
      environment: 'Playwright Chromium / SwiftShader; relative diagnostic only',
      inactive,
      activeStage3,
      delta: {
        drawCalls: activeStage3.drawCalls - inactive.drawCalls,
        triangles: activeStage3.triangles - inactive.triangles,
        programs: activeStage3.programs - inactive.programs,
        geometries: activeStage3.geometries - inactive.geometries,
        textures: activeStage3.textures - inactive.textures,
        shadowCasters: activeStage3.shadowCasters - inactive.shadowCasters,
      },
    };
    await mkdir(path.dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
