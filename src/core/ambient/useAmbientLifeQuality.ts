import { env } from '@config/env';
import { AMBIENT_LIFE_QUALITY } from '@constants/ambientLife';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';
import { useQualityProfile } from '@hooks/useQualityProfile';

export function useAmbientLifeQuality() {
  const profile = useQualityProfile();
  const benchmarkTier = useLightingDebugStore((state) => state.benchmarkTier);
  if (env.enableDebugTools && benchmarkTier !== 'device') {
    if (benchmarkTier === 'desktopHigh') return { name: 'high' as const, ...AMBIENT_LIFE_QUALITY.high };
    if (benchmarkTier === 'desktopMedium') return { name: 'medium' as const, ...AMBIENT_LIFE_QUALITY.medium };
    return { name: 'low' as const, ...AMBIENT_LIFE_QUALITY.low };
  }
  return { name: profile.name, ...AMBIENT_LIFE_QUALITY[profile.name] };
}
