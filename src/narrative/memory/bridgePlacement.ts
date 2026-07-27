import { AXIS_LAYOUT, GARDEN, MAUSOLEUM, PLATFORM, POOL, STAIRS } from '@constants/world';
import {
  TAJ_AUTHORED_BASE_TOP_Y,
  TAJ_CENTER_Z,
  TAJ_FRONT_Z,
  TAJ_MAIN_DOOR_APPROACH_Z,
  TAJ_PRESENTATION_FOOTPRINT,
} from '@constants/tajPlacement';

/**
 * Phase 10F.2 — the world-safety predicates a staged bridge position must
 * pass.
 *
 * These exist because "author five coordinates" is exactly the step where a
 * plausible-looking number puts a narrative prop in the reflecting pool, or
 * inside the mausoleum, or across the walkway a player has to use. Each rule
 * below is derived from the same world constants the geometry is built from,
 * so a bridge cannot pass by being checked against a stale copy of the
 * layout.
 *
 * Deliberately *not* a navmesh or a physics query: those need the running
 * scene. These are the coarse, checkable invariants — water, building,
 * bounds, walkways — that catch the failures a plan-view mistake actually
 * produces, and they run in a unit test rather than a capture.
 */

export interface PlacementViolation {
  rule: string;
  detail: string;
}

const TAJ_FOOTPRINT = 43;
const mausoleumCentreZ = (AXIS_LAYOUT.mausoleumStart + AXIS_LAYOUT.mausoleumEnd) / 2;

/** Water surface of the reflecting pool. A prop here would float or drown. */
export const POOL_WATER = {
  minX: -POOL.width / 2,
  maxX: POOL.width / 2,
  minZ: AXIS_LAYOUT.poolEnd,
  maxZ: AXIS_LAYOUT.poolStart,
} as const;

/** The Taj model's own footprint — measured, not assumed (see Phase 10E.2). */
export const TAJ_MODEL_FOOTPRINT = {
  minX: -TAJ_FOOTPRINT / 2,
  maxX: TAJ_FOOTPRINT / 2,
  minZ: mausoleumCentreZ - TAJ_FOOTPRINT / 2,
  maxZ: mausoleumCentreZ + TAJ_FOOTPRINT / 2,
} as const;

/** Walkable extent a bridge may occupy: the garden envelope through to the platform top. */
export const NAVIGATION_BOUNDS = {
  minX: -GARDEN.usableWidth / 2,
  maxX: GARDEN.usableWidth / 2,
  minZ: AXIS_LAYOUT.platformEnd,
  maxZ: AXIS_LAYOUT.forecourtStart,
} as const;

/**
 * Walkways a bridge must not stand in. The player has to be able to walk
 * these; a narrative prop in the middle of one is both an obstruction and a
 * composition that reads as litter rather than intent.
 *
 * The quadrant perimeter paths (x = +/-51) are deliberately **not** listed:
 * Phase 7 authored Boarding Passes and All-Day Call *along* them, and their
 * cadence/grid compositions are path compositions by design. Standing beside
 * a path is the intent there; standing in the middle of the ceremonial spine
 * is not.
 */
const CLEARANCE = 0.6;
const crossAxisZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;

export const PRIMARY_WALKWAYS: readonly { name: string; minX: number; maxX: number; minZ: number; maxZ: number }[] = [
  {
    name: 'central axis walk',
    minX: -(GARDEN.mainPathWidth / 2 + CLEARANCE),
    maxX: GARDEN.mainPathWidth / 2 + CLEARANCE,
    minZ: AXIS_LAYOUT.platformEnd,
    maxZ: AXIS_LAYOUT.forecourtStart,
  },
  {
    name: 'garden cross-axis walk',
    minX: -GARDEN.usableWidth / 2,
    maxX: GARDEN.usableWidth / 2,
    minZ: crossAxisZ - (GARDEN.mainPathWidth / 2 + CLEARANCE),
    maxZ: crossAxisZ + (GARDEN.mainPathWidth / 2 + CLEARANCE),
  },
  {
    name: 'platform stair run',
    minX: -(STAIRS.width / 2 + CLEARANCE),
    maxX: STAIRS.width / 2 + CLEARANCE,
    minZ: AXIS_LAYOUT.stairsEnd - CLEARANCE,
    maxZ: AXIS_LAYOUT.platformStart + CLEARANCE,
  },
];

/** Minaret bases, inset from the platform corners — solid geometry. */
export const MINARET_POSITIONS: readonly { x: number; z: number }[] = [-1, 1].flatMap((sx) =>
  [AXIS_LAYOUT.stairsEnd, AXIS_LAYOUT.platformEnd].map((z) => ({
    x: sx * (PLATFORM.width / 2 - 3),
    z: z + (z === AXIS_LAYOUT.stairsEnd ? -3 : 3),
  })),
);

function inside(x: number, z: number, rect: { minX: number; maxX: number; minZ: number; maxZ: number }): boolean {
  return x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ;
}

/**
 * Every reason this ground position is unsuitable for a staged bridge.
 *
 * Returns all violations rather than the first, so an authoring mistake is
 * reported in full instead of one-at-a-time across successive test runs.
 */
export function placementViolations(x: number, z: number): PlacementViolation[] {
  const violations: PlacementViolation[] = [];
  const atMainDoorThreshold = Math.abs(x) <= 4 && Math.abs(z - TAJ_MAIN_DOOR_APPROACH_Z) <= 1.5;

  if (inside(x, z, POOL_WATER)) {
    violations.push({ rule: 'pool-water', detail: `(${x}, ${z}) is inside the reflecting pool` });
  }
  if (inside(x, z, TAJ_MODEL_FOOTPRINT)) {
    violations.push({ rule: 'taj-footprint', detail: `(${x}, ${z}) is inside the Taj model footprint` });
  }
  if (!inside(x, z, NAVIGATION_BOUNDS)) {
    violations.push({ rule: 'navigation-bounds', detail: `(${x}, ${z}) is outside the walkable world` });
  }
  for (const walkway of PRIMARY_WALKWAYS) {
    if (!atMainDoorThreshold && inside(x, z, walkway)) {
      violations.push({ rule: 'primary-walkway', detail: `(${x}, ${z}) blocks the ${walkway.name}` });
    }
  }
  for (const minaret of MINARET_POSITIONS) {
    // 1.2 m radius plus a body's width of clearance.
    if (Math.hypot(x - minaret.x, z - minaret.z) < 2.6) {
      violations.push({ rule: 'minaret-base', detail: `(${x}, ${z}) is inside a minaret base` });
    }
  }
  return violations;
}

/**
 * Ground height along the final approach. The site stays at y=0; only the
 * authored white-marble base inside the Taj GLB rises to 2.7 m.
 */
export function groundHeightAt(x: number, z: number): number {
  const baseBackZ = TAJ_CENTER_Z - TAJ_PRESENTATION_FOOTPRINT / 2;
  const onAuthoredBase = Math.abs(x) <= TAJ_PRESENTATION_FOOTPRINT / 2
    && z <= TAJ_FRONT_Z
    && z >= baseBackZ;
  return onAuthoredBase ? TAJ_AUTHORED_BASE_TOP_Y : 0;
}

/** Platform top surface, for asserting a Friday Night candidate is actually on it. */
export const PLATFORM_TOP = {
  minX: -PLATFORM.width / 2,
  maxX: PLATFORM.width / 2,
  minZ: AXIS_LAYOUT.platformEnd,
  maxZ: AXIS_LAYOUT.stairsEnd,
} as const;

export function isOnPlatformTop(x: number, z: number): boolean {
  return inside(x, z, PLATFORM_TOP);
}

/** Mausoleum doorway half-width, for the m7 approach checks. */
export const DOORWAY_HALF_WIDTH = 2.35 / 2;
export const MAUSOLEUM_DEPTH = MAUSOLEUM.depth;
