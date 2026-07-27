export const AMBIENT_LIFE = {
  seed: 0x5b71a9,
  updateHz: { high: 60, medium: 30, low: 15 },
  // Phase 10B: butterflies now work sixteen flower beds instead of one clump by
  // the pool, so a few more keep each bed occasionally visited; petals rise just
  // enough to read under both blossom groves. Still a handful of points — the
  // garden is meant to be calm, not busy.
  counts: { birds: 6, butterflies: 24, petals: 14, leaves: 8, mist: 36 },
  opacity: 0.5,
  speed: 1,
} as const;

export const AMBIENT_LIFE_QUALITY = {
  high: { density: 1, birds: 1, butterflies: 1, petals: 1, leaves: 1, mist: 1 },
  medium: { density: 0.62, birds: 1, butterflies: 1, petals: 0, leaves: 0, mist: 1 },
  low: { density: 0.5, birds: 1, butterflies: 0, petals: 0, leaves: 0, mist: 0 },
} as const;

export type AmbientFamily = 'birds' | 'butterflies' | 'petals' | 'leaves' | 'mist';
