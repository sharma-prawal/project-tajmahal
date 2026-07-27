import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { DirectionalLight, Mesh, Object3D } from 'three';
import { usePlayerTarget } from '@core/camera/PlayerTargetContext';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { env } from '@config/env';
import { getWorldZone } from '@narrative/worldZone';
import { setPerfSample } from './perfSample';

const SAMPLE_INTERVAL_SECONDS = 0.5;
const SHADOW_TYPE_NAMES: Record<number, string> = { 0: 'Basic', 1: 'PCF', 2: 'PCFSoft', 3: 'VSM' };

function hasCastShadow(object: Object3D): object is Mesh {
  return 'castShadow' in object && Boolean((object as Mesh).castShadow);
}

/** Best-effort GPU renderer string via the (non-standard but widely supported) `WEBGL_debug_renderer_info` extension — `null` when unavailable, never guessed. */
function readGpuRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): string | null {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return null;
  const value = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  return typeof value === 'string' ? value : null;
}

/** Best-effort JS heap in MiB via Chromium's non-standard `performance.memory` — `null` on browsers that don't expose it. */
function readJsHeapMB(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? memory.usedJSHeapSize / (1024 * 1024) : null;
}

/**
 * Dev-only. Samples renderer stats + FPS every ~0.5s (not every frame — no
 * point re-rendering a DOM overlay 60x/sec) and writes them to the
 * `perfSample` module for `PerfHud` (outside the Canvas) to read.
 * `env.enableDebugTools`-gated like the rest of `components/dev`.
 *
 * Phase 4C: also tracks a per-frame delta ring buffer within each sample
 * window to compute a real 1% low FPS (the worst 1% of frames by delta,
 * not just the window average, which hides stutter), and reads renderer
 * configuration (DPR, shadow map size/type, exposure, environment mode)
 * directly off the live `gl`/`scene`, so it reflects whatever the Phase 4C
 * benchmark overrides (`useLightingDebugStore`) actually applied.
 */
export function PerfSampler() {
  if (!env.enableDebugTools) return null;
  return <PerfSamplerInner />;
}

function PerfSamplerInner() {
  const { gl, scene } = useThree();
  const target = usePlayerTarget();
  const quality = useQualityProfile();
  const frameCount = useRef(0);
  const elapsed = useRef(0);
  const frameDeltas = useRef<number[]>([]);
  const gpuRenderer = useMemo(() => readGpuRenderer(gl.getContext()), [gl]);

  useFrame((_, delta) => {
    frameCount.current += 1;
    elapsed.current += delta;
    frameDeltas.current.push(delta);
    if (elapsed.current < SAMPLE_INTERVAL_SECONDS) return;

    let shadowCasters = 0;
    let shadowMapSize = 0;
    scene.traverse((object) => {
      if (hasCastShadow(object)) shadowCasters += 1;
      if ((object as DirectionalLight).isDirectionalLight) {
        shadowMapSize = (object as DirectionalLight).shadow.mapSize.width;
      }
    });

    const sorted = [...frameDeltas.current].sort((a, b) => b - a); // worst (largest delta) first
    const worstCount = Math.max(1, Math.ceil(sorted.length * 0.01));
    const worstAvgDelta = sorted.slice(0, worstCount).reduce((sum, d) => sum + d, 0) / worstCount;

    const playerZ = target.current?.position.z ?? 0;

    setPerfSample({
      fps: frameCount.current / elapsed.current,
      oneLowFps: worstAvgDelta > 0 ? 1 / worstAvgDelta : 0,
      frameTimeMs: (elapsed.current / frameCount.current) * 1000,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      programs: gl.info.programs?.length ?? 0,
      shadowCasters,
      worldZone: getWorldZone(playerZ),
      qualityProfile: quality.name,
      dpr: gl.getPixelRatio(),
      shadowMapSize,
      shadowType: SHADOW_TYPE_NAMES[gl.shadowMap.type] ?? 'unknown',
      exposure: gl.toneMappingExposure,
      environmentMode: scene.environment ? 'pmrem' : 'none',
      deviceTier: quality.name,
      jsHeapMB: readJsHeapMB(),
      gpuRenderer,
    });

    frameCount.current = 0;
    elapsed.current = 0;
    frameDeltas.current = [];
  });

  return null;
}
