import { BEAT_FLOORS, SUNSET_COLOUR_STOPS, type BeatId } from '@constants/narrative';

/**
 * Pure monotonic narrative-progress model (docs/phase-2/05-art-direction.md):
 *
 *   sunT = max(persistedStoryFloor, currentBeatFloor, easedLocalBeatProgress)
 *
 * `sunT` never decreases — backtracking, turning around, or wandering never
 * reverses the sunset. Framework-free and unit-testable; the store
 * (`useSunsetStore`) is a thin wrapper that persists `persistedStoryFloor`
 * and freezes easing while hidden/paused.
 */
export function computeSunT(
  persistedStoryFloor: number,
  currentBeatFloor: number,
  easedLocalBeatProgress: number,
): number {
  return Math.max(persistedStoryFloor, currentBeatFloor, easedLocalBeatProgress);
}

export function beatFloor(beat: BeatId): number {
  return BEAT_FLOORS[beat];
}

/** Clamps a raw sunT to [0, 1] — defensive against bad inputs, never lets the value escape the valid range. */
export function clampSunT(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Looks up the sunset colour ramp (Part 5) at a given sunT, linearly
 * interpolating between the nearest stops. Cheap by design — this is a
 * colour ramp keyed by sunT, not an environment-map swap (Part 5 forbids
 * continuous env-map replacement).
 */
export function sunsetColourAt(sunT: number): string {
  const t = clampSunT(sunT);
  const stops = SUNSET_COLOUR_STOPS;

  if (t <= stops[0].t) return stops[0].hex;
  if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].hex;

  for (let i = 1; i < stops.length; i += 1) {
    if (t <= stops[i].t) {
      const prev = stops[i - 1];
      const next = stops[i];
      const span = next.t - prev.t;
      const localT = span > 0 ? (t - prev.t) / span : 0;
      const prevRgb = hexToRgb(prev.hex);
      const nextRgb = hexToRgb(next.hex);
      const mixed: [number, number, number] = [
        prevRgb[0] + (nextRgb[0] - prevRgb[0]) * localT,
        prevRgb[1] + (nextRgb[1] - prevRgb[1]) * localT,
        prevRgb[2] + (nextRgb[2] - prevRgb[2]) * localT,
      ];
      return rgbToHex(mixed);
    }
  }

  return stops[stops.length - 1].hex;
}
