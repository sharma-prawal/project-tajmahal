export const WATER = {
  // Phase 9C: a slightly lighter, calmer basin colour and glossier surface so the
  // water gently mirrors the morning sky + architecture (stronger reflection,
  // specular and environment contribution) instead of reading as a flat dark slab.
  deepColor: '#1b4a58',
  shallowColor: '#4f8992',
  edgeColor: '#83aeb0',
  roughness: 0.16,
  reflectionIntensity: 0.86,
  specularIntensity: 0.92,
  waveAmplitude: 0.035,
  waveSpeed: 0.018,
  rippleScale: 5.5,
  shorelineWidth: 0.28,
} as const;

export const WATER_QUALITY = {
  high: { reflection: 'planar', resolution: 512, updateFps: 60, amplitudeScale: 1 },
  medium: { reflection: 'planar', resolution: 256, updateFps: 30, amplitudeScale: 0.7 },
  low: { reflection: 'environment', resolution: 0, updateFps: 15, amplitudeScale: 0.45 },
} as const;

export type WaterReflectionMode = 'auto' | 'planar' | 'environment';
