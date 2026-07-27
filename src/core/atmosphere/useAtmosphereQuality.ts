import { env } from '@config/env';
import { ATMOSPHERE_QUALITY } from '@constants/atmosphere';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';

export function useAtmosphereQuality() {
  const profile = useQualityProfile();
  const benchmarkTier = useLightingDebugStore((state) => state.benchmarkTier);
  if (env.enableDebugTools && benchmarkTier !== 'device') {
    if (benchmarkTier === 'desktopHigh') return { name: 'high' as const, ...ATMOSPHERE_QUALITY.high };
    if (benchmarkTier === 'desktopMedium') return { name: 'medium' as const, ...ATMOSPHERE_QUALITY.medium };
    return { name: 'low' as const, ...ATMOSPHERE_QUALITY.low };
  }
  return { name: profile.name, ...ATMOSPHERE_QUALITY[profile.name] };
}
