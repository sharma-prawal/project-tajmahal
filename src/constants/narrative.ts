/**
 * Beat floors for the monotonic `sunT` narrative-progress model
 * (docs/phase-2/01-experience-structure.md, 05-art-direction.md). Each beat
 * has a floor `sunT` can never fall below once reached; easing moves `sunT`
 * smoothly up toward the next floor as the player advances.
 */
export type BeatId =
  | 'loading'
  | 'entrance'
  | 'garden'
  | 'pool'
  | 'approach'
  | 'platform'
  | 'door'
  | 'interior'
  | 'letter'
  | 'ending';

export const BEAT_ORDER: BeatId[] = [
  'loading',
  'entrance',
  'garden',
  'pool',
  'approach',
  'platform',
  'door',
  'interior',
  'letter',
  'ending',
];

export const BEAT_FLOORS: Record<BeatId, number> = {
  loading: 0.0,
  entrance: 0.12,
  garden: 0.35,
  pool: 0.55,
  approach: 0.72,
  platform: 0.88,
  door: 0.9,
  interior: 0.95,
  letter: 0.95,
  ending: 1.0,
};

/** Sunset colour ramp stops (Part 5), keyed by sunT 0..1. Interpolated linearly between stops. */
export const SUNSET_COLOUR_STOPS: Array<{ t: number; hex: string }> = [
  { t: 0.0, hex: '#ffe7b3' },
  { t: 0.2, hex: '#ffc98a' },
  { t: 0.4, hex: '#ff9e6b' },
  { t: 0.6, hex: '#f07a6b' },
  { t: 0.75, hex: '#c86b8f' },
  { t: 0.9, hex: '#7a5e93' },
  { t: 1.0, hex: '#2e3352' },
];

/** Exposure must stay within this EV band across the whole progression (Part 5). */
export const SUNSET_EXPOSURE_EV_RANGE = 0.3;
