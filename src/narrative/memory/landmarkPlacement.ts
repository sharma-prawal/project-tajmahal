import { AXIS_LAYOUT, PAVILION, STAIRS } from '@constants/world';
import { TAJ_AUTHORED_BASE_TOP_Y } from '@constants/tajPlacement';
import { GARDEN_SURFACE_Y } from '@components/environment/vegetation/grounding';
import { MEMORY_DEFINITIONS } from './definitions';
import type { MemoryId } from './types';

/**
 * Phase 10D.1 — where the landmarks actually stand.
 *
 * The audit's central finding: **two of the seven memories are not points.**
 * `m3` has a 22 m radius centred on open water and `m6` has a 24 m radius
 * centred on open marble — they are the pool court and the platform, not
 * objects. A single landmark at either centre would stand in the reflecting
 * pool or in the middle of the Taj approach.
 *
 * So one vocabulary, three configurations:
 *
 * - `single` — a point memory: one lamp, at the place itself.
 * - `threshold` — a place you enter on foot: a pair flanking the walkway, so
 *   the player passes *between* them and the crossing is the event.
 * - `gateway` — a place with a built threshold already (the stair head, the
 *   mausoleum door): a pair set wide, framing what is already there.
 *
 * Every landmark sits inside its own discovery volume — asserted in
 * `landmarkPlacement.test.ts` — so a player standing at a lamp is always a
 * player the state machine considers present. Nothing here changes a volume:
 * the definitions in `definitions.ts` are gameplay and untouched.
 */
export type LandmarkConfiguration = 'single' | 'threshold' | 'gateway';

export interface LandmarkPlacement {
  memoryId: MemoryId;
  configuration: LandmarkConfiguration;
  /** Ground-level world position for this individual lamp. */
  position: readonly [number, number, number];
  /** Facing, so the lamp cup's flat octagon faces the approach. */
  rotationY: number;
}

const PAVILION_Z = (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2;
const PLATFORM_TOP_Y = 0;
/** Half-width of the flanking gap at a threshold — a comfortable doorway, not a gate. */
const THRESHOLD_HALF_GAP = 2.6;

/**
 * Half-width of the final pair flanking the exterior main-door approach.
 */
const M7_LAMP_X = 3.4;
const m7Definition = MEMORY_DEFINITIONS.find((definition) => definition.id === 'm7')!;
const M7_LANDING_Z = m7Definition.location.z + 0.4;

export const LANDMARK_PLACEMENTS: readonly LandmarkPlacement[] = [
  // m1 — NW quadrant, at the southern edge of the planting rather than its
  // centre. The volume's centre (-26, -54.8) sits *inside* the 14.8 m
  // `plants-scene` group at (-25, -50), which buried the first version of this
  // lamp completely (see `PLANTING_FOOTPRINTS` and the clearance test). Set
  // just clear of it, the lamp is half-framed by foliage instead of lost in
  // it — and still under the Phase 10B accent tree's petal-fall.
  { memoryId: 'm1', configuration: 'single', position: [-26.2, GARDEN_SURFACE_Y, -58], rotationY: 0.35 },

  // m2 — SW quadrant, m1's formal mirror, clear of its own planting group for
  // the same reason. No accent tree here (the second one is mirrored in X, not
  // Z), so this lamp stands more alone than m1 does.
  { memoryId: 'm2', configuration: 'single', position: [-25.6, GARDEN_SURFACE_Y, -98.8], rotationY: -0.28 },

  // m3 — the reflecting pool court. Flanks the axis just north of the kerb
  // (`poolStart` = -121), clear of the 3.5 m main path, so walking down to the
  // water is the moment of entry.
  { memoryId: 'm3', configuration: 'threshold', position: [-THRESHOLD_HALF_GAP, GARDEN_SURFACE_Y, -120.4], rotationY: Math.PI / 2 },
  { memoryId: 'm3', configuration: 'threshold', position: [THRESHOLD_HALF_GAP, GARDEN_SURFACE_Y, -120.4], rotationY: -Math.PI / 2 },

  // m4 / m5 — on the inward pavilion thresholds. The props remain clearly
  // associated with each gazebo while staying out of its balustrades/columns.
  { memoryId: 'm4', configuration: 'single', position: [-(PAVILION.axisOffset - PAVILION.width / 2 - 1.8), 0, PAVILION_Z + 1.2], rotationY: 0.2 },
  { memoryId: 'm5', configuration: 'single', position: [PAVILION.axisOffset - PAVILION.width / 2 - 1.8, 0, PAVILION_Z + 1.2], rotationY: -0.2 },

  // m6 — the platform. A gateway pair just past the stair head
  // (`stairsEnd` = -163), set wide of the 9 m stairs so the player crests the
  // steps between them and nothing stands in the Taj sightline.
  { memoryId: 'm6', configuration: 'gateway', position: [-(STAIRS.width / 2 + 1.1), PLATFORM_TOP_Y, AXIS_LAYOUT.stairsEnd - 0.5], rotationY: Math.PI / 2 },
  { memoryId: 'm6', configuration: 'gateway', position: [STAIRS.width / 2 + 1.1, PLATFORM_TOP_Y, AXIS_LAYOUT.stairsEnd - 0.5], rotationY: -Math.PI / 2 },

  // m7 — flanks the exterior main-door approach and stays north of the solid
  // facade blocker. The player reaches it after the lateral stair climb.
  { memoryId: 'm7', configuration: 'gateway', position: [-M7_LAMP_X, TAJ_AUTHORED_BASE_TOP_Y, M7_LANDING_Z], rotationY: Math.PI / 2 },
  { memoryId: 'm7', configuration: 'gateway', position: [M7_LAMP_X, TAJ_AUTHORED_BASE_TOP_Y, M7_LANDING_Z], rotationY: -Math.PI / 2 },
];

/**
 * Footprints of the authored planting masses a landmark must not stand inside.
 *
 * Learned the hard way: m1 and m2's discovery volumes are centred *within* the
 * `plants-scene` groups `DenseGardenAssets` clones at (-25, -50) and
 * (-24, -91) — 12.52 m of authored planting at scale 1.18, so 14.8 m across —
 * and the first build of this system put both lamps inside them. The capture
 * came back as a wall of leaves with no landmark anywhere in it.
 *
 * A lamp the planting swallows fails the one thing it exists to do, so the
 * clearance is asserted rather than eyeballed.
 */
export const PLANTING_FOOTPRINTS: readonly { minX: number; maxX: number; minZ: number; maxZ: number }[] = (() => {
  const half = (12.52 * 1.18) / 2;
  return [
    [-25, -50], [25, -55], [-24, -91], [24, -97],
  ].map(([x, z]) => ({ minX: x - half, maxX: x + half, minZ: z - half, maxZ: z + half }));
})();

/** Deterministic per-lamp flicker offset, so ten flames never breathe in unison. */
export function flickerOffsetFor(index: number): number {
  return (index * 2.399963) % (Math.PI * 2);
}
