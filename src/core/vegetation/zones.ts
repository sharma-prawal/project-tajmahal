import { AXIS_LAYOUT, BOUNDARY_WALL, ENTRANCE_GATE, GARDEN, OOB_BOUNDS, PLATFORM, POOL } from '@constants/world';
import { expandBounds, type Bounds2D } from './placement';

const gardenCenterZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const quadrantOffsetX = GARDEN.usableWidth / 4;
const firstHalfZ = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.25;
const secondHalfZ = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.75;
const poolZ = (AXIS_LAYOUT.poolStart + AXIS_LAYOUT.poolEnd) / 2;
const platformFootprintZ = (AXIS_LAYOUT.stairsEnd + AXIS_LAYOUT.platformEnd) / 2;
const platformFootprintLength = AXIS_LAYOUT.platformStart - AXIS_LAYOUT.platformEnd;
const gateZ = (AXIS_LAYOUT.gateStart + AXIS_LAYOUT.gateEnd) / 2;

/** The four garden quadrant footprints (same centres `GardenDressing`/`Fountains` already use — Part 2's NW/NE/SW/SE). */
export const QUADRANT_BOUNDS: Bounds2D[] = [
  { x: -quadrantOffsetX, z: firstHalfZ },
  { x: quadrantOffsetX, z: firstHalfZ },
  { x: -quadrantOffsetX, z: secondHalfZ },
  { x: quadrantOffsetX, z: secondHalfZ },
].map(({ x, z }) => ({
  minX: x - GARDEN.quadrantWidth / 2,
  maxX: x + GARDEN.quadrantWidth / 2,
  minZ: z - GARDEN.quadrantDepth / 2,
  maxZ: z + GARDEN.quadrantDepth / 2,
}));

/** Everything vegetation must stay clear of: the paved circulation network, the pool, the platform footprint, and the fountain rims (Phase 4D geometry, unmodified — read-only here). */
export const CIRCULATION_EXCLUSIONS: Bounds2D[] = [
  // Main north-south axis (generous margin for its curb).
  expandBounds({ minX: 0, maxX: 0, minZ: AXIS_LAYOUT.approachEnd, maxZ: AXIS_LAYOUT.forecourtStart }, GARDEN.mainPathWidth / 2 + 0.6),
  // Cross axis.
  expandBounds({ minX: -GARDEN.usableWidth / 2, maxX: GARDEN.usableWidth / 2, minZ: gardenCenterZ, maxZ: gardenCenterZ }, GARDEN.mainPathWidth / 2 + 0.6),
  // Side circulation paths.
  expandBounds({ minX: -(GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth / 2), maxX: -(GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth / 2), minZ: gardenCenterZ - GARDEN.axisLength / 2, maxZ: gardenCenterZ + GARDEN.axisLength / 2 }, GARDEN.quadrantPathWidth / 2 + 0.4),
  expandBounds({ minX: GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth / 2, maxX: GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth / 2, minZ: gardenCenterZ - GARDEN.axisLength / 2, maxZ: gardenCenterZ + GARDEN.axisLength / 2 }, GARDEN.quadrantPathWidth / 2 + 0.4),
  // Reflecting pool + its coping.
  expandBounds({ minX: -POOL.width / 2, maxX: POOL.width / 2, minZ: poolZ - POOL.depth / 2, maxZ: poolZ + POOL.depth / 2 }, 1),
  // Platform footprint (including stairs run).
  expandBounds({ minX: -PLATFORM.width / 2, maxX: PLATFORM.width / 2, minZ: platformFootprintZ - platformFootprintLength / 2, maxZ: AXIS_LAYOUT.platformStart }, 1.5),
  // Entrance gate pillars.
  expandBounds({ minX: -ENTRANCE_GATE.width / 2, maxX: ENTRANCE_GATE.width / 2, minZ: gateZ - ENTRANCE_GATE.depth / 2, maxZ: gateZ + ENTRANCE_GATE.depth / 2 }, 0.5),
];

/** A margin strip just inside each boundary wall — where boundary-transition planting lives, kept clear of the walls themselves. */
export const BOUNDARY_PLANTING_BOUNDS: Bounds2D[] = [
  { minX: OOB_BOUNDS.minX + BOUNDARY_WALL.thickness, maxX: OOB_BOUNDS.minX + 3.5, minZ: AXIS_LAYOUT.mausoleumEnd, maxZ: AXIS_LAYOUT.forecourtStart },
  { minX: OOB_BOUNDS.maxX - 3.5, maxX: OOB_BOUNDS.maxX - BOUNDARY_WALL.thickness, minZ: AXIS_LAYOUT.mausoleumEnd, maxZ: AXIS_LAYOUT.forecourtStart },
];

/** A ring around the platform (outside the exclusion zone above) for platform-surrounding planting. */
export const PLATFORM_SURROUND_BOUNDS: Bounds2D = {
  minX: -PLATFORM.width / 2 - 6,
  maxX: PLATFORM.width / 2 + 6,
  minZ: AXIS_LAYOUT.platformEnd - 4,
  maxZ: AXIS_LAYOUT.platformEnd - 1,
};

/** A ring around the reflecting pool (outside its exclusion zone) for pool-surrounding planting. */
export const POOL_SURROUND_BOUNDS: Bounds2D[] = [
  { minX: -POOL.width / 2 - 3, maxX: POOL.width / 2 + 3, minZ: poolZ - POOL.depth / 2 - 3, maxZ: poolZ - POOL.depth / 2 - 1 },
  { minX: -POOL.width / 2 - 3, maxX: POOL.width / 2 + 3, minZ: poolZ + POOL.depth / 2 + 1, maxZ: poolZ + POOL.depth / 2 + 3 },
];

/** The forecourt, minus the gate footprint (already in `CIRCULATION_EXCLUSIONS`). */
export const ENTRANCE_BOUNDS: Bounds2D = {
  minX: -GARDEN.usableWidth / 2 + 2,
  maxX: GARDEN.usableWidth / 2 - 2,
  minZ: AXIS_LAYOUT.gateStart,
  maxZ: AXIS_LAYOUT.forecourtStart - 1,
};
