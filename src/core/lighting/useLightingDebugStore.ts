import { create } from 'zustand';
import { LIGHTING_CAPTURE_VIEWS } from './lightingCaptureViews';
import { SHADOW_TYPE_ORDER, type ShadowTypeName } from './shadowTypes';
import { BENCHMARK_TIER_ORDER, DPR_STEPS, SHADOW_MAP_SIZE_STEPS, type BenchmarkTier } from './benchmarkConfig';

export type LightingPreset = 'sunT' | 'neutral' | 'finalSunset';
export type { BenchmarkTier };

interface LightingDebugState {
  active: boolean;
  viewIndex: number;
  fogEnabled: boolean;
  shadowDiagnostic: boolean;
  preset: LightingPreset;
  exposureOverride: number | null; // null = use the sunT-driven exposure

  // Phase 4C benchmark overrides — dev-only, never applied outside `env.enableDebugTools`.
  benchmarkTier: BenchmarkTier; // 'device' = real capability-based profile (Phase 1 behaviour, unmodified)
  dprOverride: number | null;
  shadowMapSizeOverride: number | null;
  shadowTypeOverride: ShadowTypeName | null;

  toggle: () => void;
  next: () => void;
  toggleFog: () => void;
  toggleShadowDiagnostic: () => void;
  cyclePreset: () => void;
  cycleExposure: () => void;
  cycleBenchmarkTier: () => void;
  cycleDpr: () => void;
  cycleShadowMapSize: () => void;
  cycleShadowType: () => void;
  reset: () => void;
}

const PRESET_ORDER: LightingPreset[] = ['sunT', 'neutral', 'finalSunset'];
const EXPOSURE_STEPS: (number | null)[] = [null, 0.6, 0.8, 1.0, 1.3, 1.6];

const DEFAULTS = {
  fogEnabled: true,
  shadowDiagnostic: false,
  preset: 'sunT' as LightingPreset,
  exposureOverride: null as number | null,
  benchmarkTier: 'device' as BenchmarkTier,
  dprOverride: null as number | null,
  shadowMapSizeOverride: null as number | null,
  shadowTypeOverride: null as ShadowTypeName | null,
};

/**
 * Dev-only lighting/atmosphere inspection tool (Phase 4B "Debugging" +
 * "Capture suite"; Phase 4C "Benchmark automation"). Mirrors the bake-off
 * review store's shape (`core/bakeoff/useBakeoffReviewStore.ts`) but owns a
 * disjoint set of keybindings and state — this is about inspecting the
 * *production* scene's lighting/performance, not the Taj candidate slice.
 * Never active unless `env.enableDebugTools` mounts its controls/HUD/camera.
 *
 * Presets never mutate `sunT` itself (Phase 4B: "do not replace/redesign
 * the sunT system") — `neutral` and `finalSunset` are read by `Lighting`/
 * `SkyAndFog` as a display-only override of what colour/intensity to show.
 * The Phase 4C benchmark fields (`benchmarkTier`/`dprOverride`/
 * `shadowMapSizeOverride`/`shadowTypeOverride`) are read by `CanvasRoot`/
 * `Lighting` the same way — named, bounded overrides, not a free settings
 * panel, and `'device'`/`null` always falls back to real Phase 1/4B
 * behaviour untouched.
 */
export const useLightingDebugStore = create<LightingDebugState>((set, get) => ({
  active: false,
  viewIndex: 0,
  ...DEFAULTS,

  toggle: () => set((s) => ({ active: !s.active, viewIndex: 0 })),
  next: () => set({ viewIndex: (get().viewIndex + 1) % LIGHTING_CAPTURE_VIEWS.length }),
  toggleFog: () => set((s) => ({ fogEnabled: !s.fogEnabled })),
  toggleShadowDiagnostic: () => set((s) => ({ shadowDiagnostic: !s.shadowDiagnostic })),
  cyclePreset: () =>
    set((s) => ({ preset: PRESET_ORDER[(PRESET_ORDER.indexOf(s.preset) + 1) % PRESET_ORDER.length] })),
  cycleExposure: () =>
    set((s) => ({
      exposureOverride: EXPOSURE_STEPS[(EXPOSURE_STEPS.indexOf(s.exposureOverride) + 1) % EXPOSURE_STEPS.length],
    })),
  cycleBenchmarkTier: () =>
    set((s) => ({
      benchmarkTier: BENCHMARK_TIER_ORDER[(BENCHMARK_TIER_ORDER.indexOf(s.benchmarkTier) + 1) % BENCHMARK_TIER_ORDER.length],
    })),
  cycleDpr: () =>
    set((s) => ({ dprOverride: DPR_STEPS[(DPR_STEPS.indexOf(s.dprOverride) + 1) % DPR_STEPS.length] })),
  cycleShadowMapSize: () =>
    set((s) => ({
      shadowMapSizeOverride: SHADOW_MAP_SIZE_STEPS[(SHADOW_MAP_SIZE_STEPS.indexOf(s.shadowMapSizeOverride) + 1) % SHADOW_MAP_SIZE_STEPS.length],
    })),
  cycleShadowType: () =>
    set((s) => {
      const order: (ShadowTypeName | null)[] = [null, ...SHADOW_TYPE_ORDER];
      return { shadowTypeOverride: order[(order.indexOf(s.shadowTypeOverride) + 1) % order.length] };
    }),
  reset: () => set({ ...DEFAULTS }),
}));
