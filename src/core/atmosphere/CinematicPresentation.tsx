import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { useMemoryRuntimeSnapshot } from '@core/memoryRuntime/useMemoryRuntimeSnapshot';

/**
 * A pass-free presentation layer: a restrained edge vignette in exploration
 * and a warmer, slightly stronger veil while a production memory owns the
 * experience. It never intercepts input, never obscures the central focal
 * area, and disables its fade when reduced motion is requested.
 */
export function CinematicPresentation() {
  const quality = useQualityProfile();
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const snapshot = useMemoryRuntimeSnapshot();
  const memoryActive = snapshot.activeMemoryId !== null && snapshot.lifecycle !== 'completed';

  return (
    <div
      aria-hidden="true"
      className="cinematic-presentation"
      data-memory-active={memoryActive}
      data-quality={quality.name}
      data-reduced-motion={reducedMotion}
    />
  );
}

