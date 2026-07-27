import { AXIS_LAYOUT, GARDEN, PLATFORM } from './world';
import type { GroundRect } from '@core/environment/groundSurface';

/**
 * Phase 9A authored ground zones, all derived from the existing world layout
 * (no new dimensions). These are the surfaces that turn "one dirt plane" into
 * a set of intentional courts: a warm sandstone-dust apron under the ceremonial
 * spine (entrance forecourt, mid approach, plinth surround) and a packed-gravel
 * bed filling each garden quadrant so the lawn sits on gravel and every
 * grass→paving edge is a gravel mowing-strip, never a bare-dirt seam.
 */

const crossAxisZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const halfMainPath = GARDEN.mainPathWidth / 2;
const innerX = halfMainPath + 0.1;
const outerX = GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth;

/**
 * The four quadrant cells (path-to-path), each a gravel bed the lawn rests on.
 * Slightly larger than the 43×36 grass patch, so gravel reads as a border
 * band between grass and the surrounding marble/stone walks.
 */
export const QUADRANT_CELL_RECTS: GroundRect[] = [
  [innerX, outerX],
  [-outerX, -innerX],
].flatMap(([minX, maxX]) => [
  { minX, maxX, minZ: crossAxisZ + halfMainPath, maxZ: AXIS_LAYOUT.gardenStart - 1 },
  { minX, maxX, minZ: AXIS_LAYOUT.gardenEnd + 1, maxZ: crossAxisZ - halfMainPath },
]);

/** Warm sandstone-dust courts under the ceremonial spine. */
export const APRON_RECTS: GroundRect[] = [
  // Entrance forecourt through the gate opening (spawn court → garden threshold).
  // Widened well past the 24 m forecourt so the paved plaza reaches toward the
  // side walls and the apron→earth edge reads as a plaza rim, not a mid-court seam.
  {
    minX: -20,
    maxX: 20,
    minZ: AXIS_LAYOUT.gateEnd,
    maxZ: AXIS_LAYOUT.forecourtStart + 2,
  },
  // Mid approach between the reflecting pool and the plinth stairs.
  {
    minX: -22,
    maxX: 22,
    minZ: AXIS_LAYOUT.platformStart,
    maxZ: AXIS_LAYOUT.poolEnd,
  },
  // Plinth surround: a designed court ringing the raised platform base.
  {
    minX: -(PLATFORM.width / 2 + 8),
    maxX: PLATFORM.width / 2 + 8,
    minZ: AXIS_LAYOUT.platformEnd - 6,
    maxZ: AXIS_LAYOUT.platformStart,
  },
];

/** World metres per texture tile, tuned per surface for believable texel density. */
export const GROUND_ZONE_TILE = {
  apron: 3.5,
  gravel: 2,
} as const;

/** Y heights for the layered ground surfaces (below the 0.008 marble walk, above the base fill). */
export const GROUND_ZONE_Y = {
  gravel: 0.004,
  apron: 0.006,
} as const;
