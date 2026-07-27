import { useMemo } from 'react';
import { useDeviceStore } from '@state/useDeviceStore';
import { selectQualityProfile } from '@config/qualityProfile';
import { useExperienceSettingsStore } from '@state/useExperienceSettingsStore';

/** Capabilities are static for the session, so this only ever computes once per mount. */
export function useQualityProfile() {
  const capabilities = useDeviceStore((state) => state.capabilities);
  const preference = useExperienceSettingsStore((state) => state.quality);
  const shadows = useExperienceSettingsStore((state) => state.shadows);
  return useMemo(() => {
    const detected = selectQualityProfile(capabilities);
    if (preference === 'auto') return shadows ? detected : { ...detected, shadows: false };
    const selected = selectQualityProfile(capabilities, preference);
    return shadows ? selected : { ...selected, shadows: false };
  }, [capabilities, preference, shadows]);
}
