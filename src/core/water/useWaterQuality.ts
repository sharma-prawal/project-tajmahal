import { useQualityProfile } from '@hooks/useQualityProfile';
import { env } from '@config/env';
import { WATER_QUALITY } from '@constants/water';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';

export function useWaterQuality() {
  const profile = useQualityProfile();
  const benchmarkTier = useLightingDebugStore((state) => state.benchmarkTier);
  if (env.enableDebugTools && benchmarkTier !== 'device') {
    if (benchmarkTier === 'desktopHigh') return { name: 'high' as const, ...WATER_QUALITY.high };
    if (benchmarkTier === 'desktopMedium') return { name: 'medium' as const, ...WATER_QUALITY.medium };
    return { name: 'low' as const, ...WATER_QUALITY.low };
  }
  return { name: profile.name, ...WATER_QUALITY[profile.name] };
}
