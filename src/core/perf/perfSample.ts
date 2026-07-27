/**
 * Module-level "last sample" — like `player/lastCheckpoint.ts`, written
 * every ~0.5s from inside the Canvas (`PerfSampler`) and read by the DOM
 * `PerfHud` overlay outside the Canvas, without forcing either side to
 * re-render on every frame.
 *
 * Phase 4C additions: `oneLowFps` (1% low over the sample window, from a
 * per-frame ring buffer — the average alone hides stutter), plus renderer
 * configuration fields (`dpr`/`shadowMapSize`/`shadowType`/`exposure`/
 * `environmentMode`/`deviceTier`) and best-effort environment info
 * (`jsHeapMB`/`gpuRenderer`) for the Phase 4C benchmark suite and developer
 * diagnostics. All of the best-effort fields are `null` when the browser
 * doesn't expose the underlying API (non-Chromium `performance.memory`,
 * missing `WEBGL_debug_renderer_info`) — never fabricated.
 */
export interface PerfSample {
  fps: number;
  oneLowFps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  shadowCasters: number;
  worldZone: string;
  qualityProfile: string;
  dpr: number;
  shadowMapSize: number;
  shadowType: string;
  exposure: number;
  environmentMode: string;
  deviceTier: string;
  jsHeapMB: number | null;
  gpuRenderer: string | null;
}

export const DEFAULT_PERF_SAMPLE: PerfSample = {
  fps: 0,
  oneLowFps: 0,
  frameTimeMs: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  programs: 0,
  shadowCasters: 0,
  worldZone: 'forecourt',
  qualityProfile: 'high',
  dpr: 1,
  shadowMapSize: 0,
  shadowType: 'unknown',
  exposure: 1,
  environmentMode: 'none',
  deviceTier: 'high',
  jsHeapMB: null,
  gpuRenderer: null,
};

let sample: PerfSample = DEFAULT_PERF_SAMPLE;

export function getPerfSample(): PerfSample {
  return sample;
}

/**
 * Also mirrors onto `window.__perfSample` — this module only ever runs
 * inside a `PerfSampler` mount, which is already `env.enableDebugTools`-
 * gated, so this never exists in a production build. It exists solely so
 * the Phase 4C benchmark script (`scripts/benchmark-render.ts`, driven via
 * Playwright's `page.evaluate`) can read structured data instead of
 * scraping `PerfHud`'s rendered text.
 */
export function setPerfSample(next: PerfSample): void {
  sample = next;
  if (typeof window !== 'undefined') {
    (window as typeof window & { __perfSample?: PerfSample }).__perfSample = next;
  }
}
