import { AXIS_LAYOUT, GARDEN, PAVILION } from '@constants/world';
import { TAJ_AUTHORED_STAIR_APPROACH_X, TAJ_FRONT_Z, TAJ_PRESENTATION_FOOTPRINT } from '@constants/tajPlacement';
import { createSeededRandom, randomRange } from './random';
import type { Bounds2D, VegetationInstance } from './placement';

export const GARDEN_COMPOSITION_CENTER_Z = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const PAVILION_Z = (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2;

/**
 * Bilateral (X-only) mirror for features on the approach/plinth spine, which
 * must appear on both sides but must NOT 4-fold mirror back into the garden
 * (the Z mirror of an approach anchor lands in the garden entrance).
 */
function createBilateralComposition(
  anchors: readonly PlanarPoint[],
  seed: number,
  scaleRange: readonly [number, number],
  groundY = 0,
): VegetationInstance[] {
  const random = createSeededRandom(seed);
  const instances: VegetationInstance[] = [];
  for (const [x, z] of anchors) {
    for (const mirroredX of [x, -x]) {
      instances.push({
        position: [mirroredX, groundY, z],
        rotationY: randomRange(random, 0, Math.PI * 2),
        scale: randomRange(random, scaleRange[0], scaleRange[1]),
      });
    }
  }
  return instances;
}

type PlanarPoint = readonly [x: number, z: number];

/** A small natural drift inside the otherwise formal Charbagh grid. */
export const COMPOSITION_ASYMMETRY = 0.28;

/**
 * Per-quadrant character (Phase 10A). Order matches the mirror expansion:
 * NW (authored) · NE · SW · SE. A small fixed drift plus a scale bias gives
 * each quarter a subtly different feel — NW reads a touch more mature/shaded,
 * SE lighter/opener — while the Charbagh's formal cross-axis order is kept.
 * Kept deliberately small: matched, not identical; never randomly scattered.
 */
const QUADRANT_BIAS = [
  { dx: 0.0, dz: 0.0, scale: 1.02 },
  { dx: 0.18, dz: -0.12, scale: 0.99 },
  { dx: -0.14, dz: 0.16, scale: 1.01 },
  { dx: 0.12, dz: 0.1, scale: 0.98 },
] as const;

/**
 * Authored anchors establish the landscape-architecture rhythm. Mirroring
 * preserves the Charbagh's macro order; Phase 10A adds a small deterministic
 * per-quadrant drift + scale bias (and keeps the independent rotation/scale)
 * so the four quarters read as a matched formal set rather than four identical
 * copies — subtle asymmetry within a formal layout. Instance counts are
 * unchanged (repositioning/scaling only, so draw calls are unaffected).
 */
export function createMirroredComposition(
  northWestAnchors: readonly PlanarPoint[],
  seed: number,
  scaleRange: readonly [number, number],
  groundY = 0,
): VegetationInstance[] {
  const random = createSeededRandom(seed);
  const instances: VegetationInstance[] = [];

  for (const [x, z] of northWestAnchors) {
    const mirrored: PlanarPoint[] = [
      [x, z],
      [-x, z],
      [x, GARDEN_COMPOSITION_CENTER_Z * 2 - z],
      [-x, GARDEN_COMPOSITION_CENTER_Z * 2 - z],
    ];
    mirrored.forEach(([mirroredX, mirroredZ], quadrant) => {
      const bias = QUADRANT_BIAS[quadrant];
      const jitterX = randomRange(random, -COMPOSITION_ASYMMETRY, COMPOSITION_ASYMMETRY);
      const jitterZ = randomRange(random, -COMPOSITION_ASYMMETRY, COMPOSITION_ASYMMETRY);
      instances.push({
        position: [mirroredX + bias.dx + jitterX, groundY, mirroredZ + bias.dz + jitterZ],
        rotationY: randomRange(random, 0, Math.PI * 2),
        scale: randomRange(random, scaleRange[0], scaleRange[1]) * bias.scale,
      });
    });
  }

  return instances;
}

function mirrorBounds(bounds: Bounds2D): Bounds2D[] {
  const mirrorZ = (z: number) => GARDEN_COMPOSITION_CENTER_Z * 2 - z;
  return [
    bounds,
    { minX: -bounds.maxX, maxX: -bounds.minX, minZ: bounds.minZ, maxZ: bounds.maxZ },
    { minX: bounds.minX, maxX: bounds.maxX, minZ: mirrorZ(bounds.maxZ), maxZ: mirrorZ(bounds.minZ) },
    { minX: -bounds.maxX, maxX: -bounds.minX, minZ: mirrorZ(bounds.maxZ), maxZ: mirrorZ(bounds.minZ) },
  ];
}

/**
 * Two aligned parterres per quarter. The broader 9.5–10.5 × 15 m modules fill
 * the lawn between the authored tree rows without touching their trunks. This
 * is intentionally generous: undersized beds read as isolated props in a
 * Charbagh, while these paired rectangles read as one formal planted room.
 */
export const COMPOSED_FLOWER_BED_BOUNDS: Bounds2D[] = [
  ...mirrorBounds({ minX: -36.5, maxX: -27, minZ: -60, maxZ: -45 }),
  ...mirrorBounds({ minX: -25.5, maxX: -15, minZ: -60, maxZ: -45 }),
];

/** Warm, cool and cream repeats are paired by quarter, never randomly mixed. */
export const COMPOSED_FLOWER_BED_PALETTE = [0, 1, 2, 1, 0, 2, 1, 0] as const;

/**
 * Two framed planting borders flanking the forecourt walkway — the first
 * thing the player sees, so it gets the same treatment as the garden's own
 * parterres (raised soil + marble edging + dense layered planting) rather
 * than a loose scatter of shrubs on bare sand. Deliberately separate from
 * `COMPOSED_FLOWER_BED_BOUNDS` (a pinned contract of eight >140 m² garden
 * rooms) — these are narrow entrance borders, a different planting shape,
 * so they carry their own array and their own warm marigold palette.
 */
const FORECOURT_BED_INNER_X = GARDEN.mainPathWidth / 2 + 0.35;
const FORECOURT_BED_OUTER_X = FORECOURT_BED_INNER_X + 2.4;
export const COMPOSED_FORECOURT_BED_BOUNDS: Bounds2D[] = [
  { minX: -FORECOURT_BED_OUTER_X, maxX: -FORECOURT_BED_INNER_X, minZ: -19, maxZ: -6 },
  { minX: FORECOURT_BED_INNER_X, maxX: FORECOURT_BED_OUTER_X, minZ: -19, maxZ: -6 },
];
/** Warm marigold both sides — a welcoming, symmetric entrance frame. */
export const COMPOSED_FORECOURT_BED_PALETTE = [0, 0] as const;

/**
 * Two low floral borders soften the Taj's garden-facing plinth without
 * crossing the central approach or either authored lateral stair route.
 */
const TAJ_FRONT_BED_INNER_X = TAJ_AUTHORED_STAIR_APPROACH_X + 1;
const TAJ_FRONT_BED_OUTER_X = TAJ_PRESENTATION_FOOTPRINT / 2 - 2;
export const COMPOSED_TAJ_FRONT_BED_BOUNDS: Bounds2D[] = [
  { minX: -TAJ_FRONT_BED_OUTER_X, maxX: -TAJ_FRONT_BED_INNER_X, minZ: TAJ_FRONT_Z + 0.65, maxZ: TAJ_FRONT_Z + 1.55 },
  { minX: TAJ_FRONT_BED_INNER_X, maxX: TAJ_FRONT_BED_OUTER_X, minZ: TAJ_FRONT_Z + 0.65, maxZ: TAJ_FRONT_Z + 1.55 },
];
export const COMPOSED_TAJ_FRONT_BED_PALETTE = [0, 0] as const;

/**
 * The two accent-tree anchors.
 *
 * Phase 10B put a whole 45 m tree-pack grove at each, scaled to ~5 m, which
 * gave the garden its only pink blossom. Phase 10B.1 lost that: the tree-pack
 * was deleted before its intended replacement was verified, the replacement (a
 * scanned jacaranda) was then rejected because its canopy cannot survive
 * decimation, and tinting a green leaf texture pink produces mud, not blossom.
 * The anchors are therefore green specimen trees, and the garden currently has
 * no flowering tree. See the Phase 10B.1 report.
 *
 * Shared rather than owned by the renderer because the falling-petal ambient
 * family has to land under the trees it is supposedly falling from — petals
 * drifting over open lawn is exactly the kind of detail that reads as "effect"
 * instead of "garden".
 */
export const COMPOSED_ACCENT_TREES = [
  { position: [-42, -52] as const, rotation: 0.22, scale: 0.55, canopyRadius: 3.7, species: 'amberMature' },
  { position: [42, -52] as const, rotation: Math.PI - 0.22, scale: 0.7, canopyRadius: 3.1, species: 'greenFormal' },
  { position: [-42, -98] as const, rotation: 0.38, scale: 0.72, canopyRadius: 3.0, species: 'redOak' },
  { position: [42, -98] as const, rotation: Math.PI - 0.38, scale: 0.55, canopyRadius: 3.7, species: 'amberTall' },
] as const;

/** Sparse grass belongs to the outer planting layer, leaving the inner lawns calm. */
export const COMPOSED_GRASS_PATCH_BOUNDS: Bounds2D[] = [
  ...mirrorBounds({ minX: -46, maxX: -32, minZ: -68, maxZ: -53 }),
  ...mirrorBounds({ minX: -29, maxX: -17, minZ: -45, maxZ: -36 }),
];

/**
 * The mid-ground tree anchors, ordered. `Trees.tsx` assigns a species per
 * anchor by distance from the central axis, so this list's **order and length
 * are load-bearing** — `TREE_ANCHOR_COUNT` and a `composition.test.ts` case
 * pin them so a future edit here cannot silently re-species the garden.
 */
const TREE_ANCHORS = [
  [-43, -40],
  [-43, -64],
  [-33, -40],
  [-33, -64],
  [-12, -40],
  [-12, -52],
  [-12, -64],
] as const;

export const TREE_ANCHOR_COUNT = TREE_ANCHORS.length;

export const COMPOSED_TREE_INSTANCES = createMirroredComposition(
  TREE_ANCHORS,
  9101,
  [0.66, 0.8],
);

/**
 * Gazebo-base grounding (Phase 10A) — a few low shrubs turn each pavilion from
 * a floating object in the open approach into a tended *destination*. X-mirror
 * only (both gazebos, no 4-fold mirror back into the garden), clustered just
 * outside each ~15 m pavilion footprint and deliberately asymmetric.
 */
export const COMPOSED_GAZEBO_SHRUBS = createBilateralComposition(
  [
    [PAVILION.axisOffset - 8.6, PAVILION_Z + 3.6],
    [PAVILION.axisOffset + 8.4, PAVILION_Z + 1.2],
    [PAVILION.axisOffset - 7.2, PAVILION_Z - 4.4],
    [PAVILION.axisOffset + 6.4, PAVILION_Z - 3.1],
  ],
  9105,
  [0.8, 1.14],
);

/** Low ornamental frames around the gate, paired approach memories, and pavilions. */
export const COMPOSED_SHRUB_INSTANCES = [
  ...createMirroredComposition(
    [
      [-12, -34],
      [-26, -37],
      [-25, -120],
      [-29, -130],
      [-29, -139],
    ],
    9102,
    [0.76, 1.08],
  ),
  ...COMPOSED_GAZEBO_SHRUBS,
];

/** Rocks move out of the formal pool foreground and sit quietly beneath the outer planting layer. */
export const COMPOSED_ROCK_INSTANCES = createMirroredComposition(
  [
    [-39.5, -50.8],
    [-38.7, -51.9],
  ],
  9103,
  [0.42, 0.72],
  -0.06,
);

/**
 * Real scanned planting groups restored as formal underplanting rather than
 * free scatter. Meadow groups sit between canopy rows; lupines form one
 * purple punctuation inside each parterre.
 */
export const COMPOSED_MEADOW_INSTANCES = createMirroredComposition(
  [
    [-24.5, -41.5],
    [-24.5, -62.5],
  ],
  9106,
  [0.32, 0.37],
);

export const COMPOSED_LUPINE_INSTANCES = createMirroredComposition(
  [
    [-31, -52],
    [-19, -52],
  ],
  9107,
  [0.5, 0.58],
);

/**
 * Boundary hedge runs, with the 14 m gateway Phase 9D cut around the paired
 * All-Day Call / Boarding Passes memory sites so the boundary rhythm visibly
 * breaks where those memories sit.
 *
 * **Nothing renders these, deliberately.** `Hedges.tsx` drew them as a box
 * plus three icosahedron lobes in flat untextured green and was never mounted;
 * Phase 10D deleted that component rather than revive the one look this arc has
 * twice upgraded away from, and rebuilding the rows from scanned shrubs would
 * have cost ~300 k triangles for structure the raised bed borders already give.
 * The data is kept because the gateway is a narrative design decision worth
 * preserving for whoever builds a real clipped hedge — see the 10D report.
 */
export const COMPOSED_HEDGE_SEGMENTS = [
  { fromZ: AXIS_LAYOUT.gardenEnd + 2, toZ: GARDEN_COMPOSITION_CENTER_Z - 7 },
  { fromZ: GARDEN_COMPOSITION_CENTER_Z + 7, toZ: AXIS_LAYOUT.gardenStart - 2 },
] as const;

export const COMPOSED_HEDGE_X = GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth / 2;
