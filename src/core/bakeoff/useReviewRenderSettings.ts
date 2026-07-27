import type { QualityProfile } from '@config/qualityProfile';
import { TIER_RENDER_SETTINGS } from './reviewConfig';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';

/**
 * Merges the real capability-based quality profile with dev-only render
 * overrides — the bake-off review mode's tier/shadow overrides (Phase 3B
 * Part 1) and the Phase 4C lighting-debug benchmark overrides
 * (`benchmarkTier`/`dprOverride`). Falls through to the real profile
 * untouched when neither tool is active, so this stays the single place
 * `CanvasRoot`/`Lighting` read for renderer settings — they never disagree.
 *
 * Precedence when both happen to be active (not an expected combination,
 * but never undefined behaviour): bake-off review wins, since it's the
 * older, narrower-purpose tool.
 */
export function useReviewRenderSettings(baseQuality: QualityProfile) {
  const bakeoffActive = useBakeoffReviewStore((s) => s.active);
  const bakeoffTier = useBakeoffReviewStore((s) => s.tier);
  const bakeoffShadows = useBakeoffReviewStore((s) => s.shadows);

  const benchmarkTier = useLightingDebugStore((s) => s.benchmarkTier);
  const dprOverride = useLightingDebugStore((s) => s.dprOverride);

  if (bakeoffActive) {
    const settings = TIER_RENDER_SETTINGS[bakeoffTier];
    return {
      name: baseQuality.name,
      dpr: settings.dpr,
      antialias: settings.antialias,
      shadows: settings.shadows && bakeoffShadows,
      shadowMapSize: settings.shadowMapSize,
    } satisfies QualityProfile;
  }

  if (benchmarkTier !== 'device') {
    const settings = TIER_RENDER_SETTINGS[benchmarkTier];
    return {
      name: baseQuality.name,
      dpr: dprOverride !== null ? ([dprOverride, dprOverride] satisfies [number, number]) : settings.dpr,
      antialias: settings.antialias,
      shadows: settings.shadows,
      shadowMapSize: settings.shadowMapSize,
    } satisfies QualityProfile;
  }

  if (dprOverride !== null) {
    return { ...baseQuality, dpr: [dprOverride, dprOverride] satisfies [number, number] };
  }

  return baseQuality;
}
