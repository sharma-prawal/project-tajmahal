/**
 * Phase 4C performance benchmark. Boots a dev server with debug tools
 * force-enabled, drives the production scene's Phase 4C benchmark overrides
 * (`useLightingDebugStore`) via Playwright, and reads real, structured
 * frame-time/renderer-stat data off `window.__perfSample` (written by the
 * existing `PerfSampler`, mirrored there solely for this script — see
 * `core/perf/perfSample.ts`). Writes a JSON report to
 * `artifacts/review/benchmark/render-benchmark.json` and prints a markdown
 * table. Never invoked by the app itself; dev-only tooling, run via
 * `pnpm benchmark:render`.
 *
 * This does not attempt a full DPR × shadow-size × shadow-type × tier cross
 * product (that's hundreds of configs) — it runs four targeted, one-
 * variable-at-a-time sweeps against a fixed baseline, which is enough to
 * see each axis's individual cost without an unreasonable run time.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import {
  BENCHMARK_TIER_ORDER,
  DPR_STEPS,
  SHADOW_MAP_SIZE_STEPS,
  type BenchmarkTier,
} from '../src/core/lighting/benchmarkConfig.ts';
import { SHADOW_TYPE_ORDER, type ShadowTypeName } from '../src/core/lighting/shadowTypes.ts';

const PORT = 5186;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/benchmark');
const INITIAL_LOAD_WAIT_MS = 20000;
const SETTLE_MS = 3000; // let ≥5 of PerfSampler's 0.5s windows elapse under the new config before reading

interface Config {
  label: string;
  sweep: string;
  tier: BenchmarkTier;
  dpr: number | null;
  shadowMapSize: number | null;
  shadowType: ShadowTypeName | null;
}

interface PerfSampleShape {
  fps: number;
  oneLowFps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  programs: number;
  dpr: number;
  shadowMapSize: number;
  shadowType: string;
  jsHeapMB: number | null;
  gpuRenderer: string | null;
}

interface Result extends Config {
  sample: PerfSampleShape | null;
  error: string | null;
}

const BASELINE = { tier: 'desktopHigh' as BenchmarkTier, dpr: 1.0, shadowMapSize: null as number | null, shadowType: null as ShadowTypeName | null };

function buildMatrix(): Config[] {
  const configs: Config[] = [];

  for (const tier of BENCHMARK_TIER_ORDER) {
    configs.push({ label: `tier=${tier}`, sweep: 'tier', tier, dpr: null, shadowMapSize: null, shadowType: null });
  }

  for (const dpr of DPR_STEPS.filter((d): d is number => d !== null)) {
    configs.push({ label: `dpr=${dpr}`, sweep: 'dpr', tier: BASELINE.tier, dpr, shadowMapSize: null, shadowType: null });
  }

  for (const size of SHADOW_MAP_SIZE_STEPS.filter((s): s is number => s !== null)) {
    configs.push({ label: `shadowMapSize=${size}`, sweep: 'shadowMapSize', tier: BASELINE.tier, dpr: BASELINE.dpr, shadowMapSize: size, shadowType: null });
  }

  for (const type of SHADOW_TYPE_ORDER) {
    configs.push({ label: `shadowType=${type}`, sweep: 'shadowType', tier: BASELINE.tier, dpr: BASELINE.dpr, shadowMapSize: null, shadowType: type });
  }

  return configs;
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
    await page.waitForTimeout(120);
  }
}

async function applyConfig(
  page: Page,
  target: Config,
  state: { tier: BenchmarkTier; dpr: number | null; shadowMapSize: number | null; shadowType: ShadowTypeName | null },
): Promise<void> {
  const tierSteps = (BENCHMARK_TIER_ORDER.indexOf(target.tier) - BENCHMARK_TIER_ORDER.indexOf(state.tier) + BENCHMARK_TIER_ORDER.length) % BENCHMARK_TIER_ORDER.length;
  await cyclePress(page, 'KeyT', tierSteps);
  state.tier = target.tier;

  const dprSteps = (DPR_STEPS.indexOf(target.dpr) - DPR_STEPS.indexOf(state.dpr) + DPR_STEPS.length) % DPR_STEPS.length;
  await cyclePress(page, 'KeyD', dprSteps);
  state.dpr = target.dpr;

  const sizeSteps = (SHADOW_MAP_SIZE_STEPS.indexOf(target.shadowMapSize) - SHADOW_MAP_SIZE_STEPS.indexOf(state.shadowMapSize) + SHADOW_MAP_SIZE_STEPS.length) % SHADOW_MAP_SIZE_STEPS.length;
  await cyclePress(page, 'KeyS', sizeSteps);
  state.shadowMapSize = target.shadowMapSize;

  const typeOrder: (ShadowTypeName | null)[] = [null, ...SHADOW_TYPE_ORDER];
  const typeSteps = (typeOrder.indexOf(target.shadowType) - typeOrder.indexOf(state.shadowType) + typeOrder.length) % typeOrder.length;
  await cyclePress(page, 'KeyY', typeSteps);
  state.shadowType = target.shadowType;
}

async function run(): Promise<Result[]> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const results: Result[] = [];
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;

  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' },
      stdio: 'pipe',
    });
    await waitForServer(BASE_URL, 30_000);

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(60_000);

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await page.waitForTimeout(INITIAL_LOAD_WAIT_MS);
    await page.keyboard.press('KeyV'); // enter lighting debug mode (required for benchmark overrides to apply)
    await page.waitForTimeout(1000);

    const state = { tier: 'device' as BenchmarkTier, dpr: null as number | null, shadowMapSize: null as number | null, shadowType: null as ShadowTypeName | null };

    for (const config of buildMatrix()) {
      try {
        await applyConfig(page, config, state);
        await page.waitForTimeout(SETTLE_MS);
        const sample = await page.evaluate(() => (window as unknown as { __perfSample?: PerfSampleShape }).__perfSample ?? null);
        results.push({ ...config, sample, error: null });
        console.log(`  ${sample ? '✓' : '?'} ${config.label}: fps=${sample?.fps.toFixed(1) ?? 'n/a'} 1%low=${sample?.oneLowFps.toFixed(1) ?? 'n/a'} draws=${sample?.drawCalls ?? 'n/a'} tris=${sample?.triangles ?? 'n/a'}`);
      } catch (error) {
        results.push({ ...config, sample: null, error: error instanceof Error ? error.message : String(error) });
        console.log(`  ✗ ${config.label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await page.close();
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }

  return results;
}

function toMarkdownTable(results: Result[]): string {
  const header = '| Sweep | Config | FPS | 1% Low FPS | Frame ms | Draw Calls | Triangles | Programs | JS Heap MB | GPU |';
  const divider = '|---|---|---:|---:|---:|---:|---:|---:|---:|---|';
  const rows = results.map((r) => {
    const s = r.sample;
    if (!s) return `| ${r.sweep} | ${r.label} | NOT MEASURED (${r.error ?? 'no sample'}) | | | | | | | |`;
    return `| ${r.sweep} | ${r.label} | ${s.fps.toFixed(1)} | ${s.oneLowFps.toFixed(1)} | ${s.frameTimeMs.toFixed(1)} | ${s.drawCalls} | ${s.triangles.toLocaleString()} | ${s.programs} | ${s.jsHeapMB === null ? 'NOT MEASURED' : s.jsHeapMB.toFixed(0)} | ${s.gpuRenderer ?? 'NOT MEASURED'} |`;
  });
  return [header, divider, ...rows].join('\n');
}

run()
  .then(async (results) => {
    const jsonPath = path.join(OUTPUT_DIR, 'render-benchmark.json');
    await writeFile(jsonPath, JSON.stringify(results, null, 2));
    console.log(`\nWrote ${jsonPath}\n`);
    console.log(toMarkdownTable(results));
  })
  .catch((error) => {
    console.error('Benchmark run failed to start:', error);
    process.exitCode = 1;
  });
