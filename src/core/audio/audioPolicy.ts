export type AudioQualityName = 'high' | 'medium' | 'low';
export type FootstepSurface = 'grass' | 'marble' | 'stone' | 'stairs' | 'sand' | 'wood';

export const AUDIO_DEFAULTS = {
  master: 0.72,
  ambience: 0.42,
  effects: 0.64,
} as const;

export const AUDIO_VOICE_LIMITS: Record<AudioQualityName, number> = {
  high: 12,
  medium: 8,
  low: 5,
};

export function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function footstepIntervalSeconds(speed: number, running: boolean): number {
  const normalized = Math.min(1, Math.max(0, speed / (running ? 4.8 : 2.5)));
  return (running ? 0.34 : 0.54) - normalized * (running ? 0.08 : 0.12);
}

export function fountainAttenuation(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  const d = Math.max(0, distance);
  return 1 / (1 + (d / 8) ** 2);
}

export function memoryAmbienceScale(active: boolean): number {
  return active ? 0.42 : 1;
}

const GARDEN_CENTRE_Z = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const TAJ_STAIR_CENTER_X = (TAJ_AUTHORED_STAIR_APPROACH_X + TAJ_AUTHORED_STAIR_INNER_X) / 2;
const TAJ_STAIR_HALF_RUN = (TAJ_AUTHORED_STAIR_APPROACH_X - TAJ_AUTHORED_STAIR_INNER_X) / 2;

/**
 * Mirrors the authored ground plan without a physics raycast. Thin visual
 * ground dressing shares one collider, so x/z is the authoritative way to
 * identify what the visitor can see beneath her feet.
 */
export function footstepSurfaceAt(x: number, z: number): FootstepSurface {
  if (
    Math.abs(z - TAJ_AUTHORED_STAIR_CENTER_Z) <= TAJ_AUTHORED_STAIR_DEPTH / 2 + 0.2
    && Math.abs(Math.abs(x) - TAJ_STAIR_CENTER_X) <= TAJ_STAIR_HALF_RUN + 0.2
  ) return 'stairs';
  if (z <= AXIS_LAYOUT.stairsEnd && z > AXIS_LAYOUT.platformEnd) return 'marble';
  if (z <= AXIS_LAYOUT.gardenEnd && z > AXIS_LAYOUT.approachEnd) {
    const poolSideX = (POOL.width + POOL.sidePathWidth) / 2;
    if (z > AXIS_LAYOUT.poolEnd && Math.abs(Math.abs(x) - poolSideX) <= POOL.sidePathWidth / 2 + 0.25) return 'stone';
    return Math.abs(x) <= GARDEN.mainPathWidth / 2 + 0.15 ? 'marble' : 'sand';
  }
  if (z <= AXIS_LAYOUT.gardenStart && z > AXIS_LAYOUT.gardenEnd) {
    if (Math.abs(x) <= GARDEN.mainPathWidth / 2 + 0.15 || Math.abs(z - GARDEN_CENTRE_Z) <= GARDEN.mainPathWidth / 2 + 0.15) return 'marble';
    const sidePathX = GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth / 2;
    if (Math.abs(Math.abs(x) - sidePathX) <= GARDEN.quadrantPathWidth / 2 + 0.25) return 'stone';
    return 'grass';
  }
  if (z > AXIS_LAYOUT.gardenStart && Math.abs(x) <= GARDEN.mainPathWidth / 2 + 0.15) return 'marble';
  if (z <= AXIS_LAYOUT.approachStart && z > AXIS_LAYOUT.approachEnd && Math.abs(x) > APPROACH.length) return 'sand';
  if (z <= AXIS_LAYOUT.platformStart && z > AXIS_LAYOUT.platformEnd && Math.abs(x) <= PLATFORM.width / 2) return 'marble';
  return 'sand';
}
import { APPROACH, AXIS_LAYOUT, GARDEN, PLATFORM, POOL } from '@constants/world';
import {
  TAJ_AUTHORED_STAIR_APPROACH_X,
  TAJ_AUTHORED_STAIR_CENTER_Z,
  TAJ_AUTHORED_STAIR_DEPTH,
  TAJ_AUTHORED_STAIR_INNER_X,
} from '@constants/tajPlacement';
