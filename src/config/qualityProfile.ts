import type { DeviceCapabilities } from '@utils/device';

export interface QualityProfile {
  name: 'low' | 'medium' | 'high';
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
}

const LOW_PROFILE: QualityProfile = {
  name: 'low',
  dpr: [1, 1],
  antialias: false,
  shadows: false,
  shadowMapSize: 1024,
};

const HIGH_PROFILE: QualityProfile = {
  name: 'high',
  dpr: [1, 2],
  antialias: true,
  shadows: true,
  shadowMapSize: 2048,
};

const MEDIUM_PROFILE: QualityProfile = {
  name: 'medium',
  dpr: [1, 1.5],
  antialias: true,
  shadows: true,
  shadowMapSize: 1024,
};

/**
 * Coarse, capability-based quality tier — not a settings UI. Touch-primary
 * devices (phones/tablets) and low-core-count machines get the cheap
 * profile; everything else gets the desktop-grade one. Re-evaluate this
 * once real device telemetry exists instead of adding more heuristics here.
 */
export function selectQualityProfile(capabilities: DeviceCapabilities, preference: 'high' | 'balanced' | 'performance' | null = null): QualityProfile {
  if (preference === 'high') return HIGH_PROFILE;
  if (preference === 'balanced') return MEDIUM_PROFILE;
  if (preference === 'performance') return LOW_PROFILE;
  const isTouchPrimary = capabilities.hasTouch && !capabilities.hasFinePointer;
  const isLowCoreCount =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency <= 4;

  const isMidCoreCount =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency <= 8;
  if (isTouchPrimary || isLowCoreCount) return LOW_PROFILE;
  return isMidCoreCount ? MEDIUM_PROFILE : HIGH_PROFILE;
}
