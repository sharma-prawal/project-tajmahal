import { AXIS_LAYOUT } from '@constants/world';

/**
 * Pure zone lookup from a world-space Z position along the main axis —
 * used by the dev performance HUD ("current world zone", Part 10) and
 * available for any future system that wants a coarse "where is the player"
 * answer without re-deriving axis boundaries.
 */
export type WorldZone =
  | 'forecourt'
  | 'gate'
  | 'garden'
  | 'pool'
  | 'approach'
  | 'platform'
  | 'mausoleum'
  | 'beyond';

export function getWorldZone(z: number): WorldZone {
  if (z > AXIS_LAYOUT.forecourtStart) return 'beyond';
  if (z > AXIS_LAYOUT.forecourtEnd) return 'forecourt';
  if (z > AXIS_LAYOUT.gateEnd) return 'gate';
  if (z > AXIS_LAYOUT.gardenEnd) return 'garden';
  if (z > AXIS_LAYOUT.poolEnd) return 'pool';
  if (z > AXIS_LAYOUT.approachEnd) return 'approach';
  if (z > AXIS_LAYOUT.platformEnd) return 'platform';
  if (z > AXIS_LAYOUT.mausoleumEnd) return 'mausoleum';
  return 'beyond';
}
