import { CuboidCollider, RigidBody } from '@react-three/rapier';
import {
  TAJ_AUTHORED_BASE_TOP_Y,
  TAJ_AUTHORED_STAIR_APPROACH_X,
  TAJ_AUTHORED_STAIR_CENTER_Z,
  TAJ_AUTHORED_STAIR_DEPTH,
  TAJ_AUTHORED_STAIR_INNER_X,
  TAJ_CENTER_Z,
  TAJ_FRONT_Z,
  TAJ_PRESENTATION_FOOTPRINT,
} from '@constants/tajPlacement';
import { useMemoryRuntimeCompletedCount } from '@core/memoryRuntime/useMemoryRuntimeSnapshot';
import { isFinalMemoryApproachUnlocked } from '@narrative/memory/memoryProgress';
import { deriveCompletedIds, useMemoryStore } from '@narrative/memory/useMemoryStore';

const BASE_HALF_SIZE = TAJ_PRESENTATION_FOOTPRINT / 2;
const BASE_BACK_Z = TAJ_CENTER_Z - BASE_HALF_SIZE;
const BASE_FRONT_Z = TAJ_FRONT_Z;
const STAIR_BACK_Z = TAJ_FRONT_Z - TAJ_AUTHORED_STAIR_DEPTH;
const REAR_DECK_DEPTH = STAIR_BACK_Z - BASE_BACK_Z;
const FRONT_BAND_DEPTH = BASE_FRONT_Z - STAIR_BACK_Z;
/**
 * The side walls now sit flush with the authored stair channel edges (inner at
 * `INNER_X`, outer at `APPROACH_X`) instead of leaving a 0.35 m gap. Those gaps
 * used to catch the capsule at the wall/ramp seam, making the ascent feel rough.
 */
const OUTER_WALL_WIDTH = BASE_HALF_SIZE - TAJ_AUTHORED_STAIR_APPROACH_X;
const CENTER_WALL_WIDTH = TAJ_AUTHORED_STAIR_INNER_X * 2;
const RAMP_RUN = TAJ_AUTHORED_STAIR_APPROACH_X - TAJ_AUTHORED_STAIR_INNER_X;
const RAMP_CENTER_X = (TAJ_AUTHORED_STAIR_APPROACH_X + TAJ_AUTHORED_STAIR_INNER_X) / 2;
const RAMP_ANGLE = Math.atan(TAJ_AUTHORED_BASE_TOP_Y / RAMP_RUN);
const RAMP_LENGTH = Math.hypot(RAMP_RUN, TAJ_AUTHORED_BASE_TOP_Y);
/**
 * The ramp is a SOLID wedge, not a thin floating slab. Its top face is the
 * walking surface — the line from the outer foot at ground level up to the
 * inner landing at base-top height — while the body is thick enough that its
 * underside is buried below the terrain. The old thin slab (0.3 m, centred at
 * mid-height) left an open cavity beneath the flight the capsule could slip
 * into and get stuck under the stairs; a solid wedge removes that cavity.
 */
const RAMP_FILL_THICKNESS = TAJ_AUTHORED_BASE_TOP_Y + 1;
/** Slight overlap so the locked blocker seals the channel walls without a seam. */
const STAIR_CHANNEL_OVERLAP = 0.05;
const LOCKED_BLOCKER_HALF_WIDTH = RAMP_RUN / 2 + STAIR_CHANNEL_OVERLAP;

export const TAJ_LOCKED_STAIR_BLOCKER_SPECS = [-1, 1].map((side) => ({
  side,
  args: [LOCKED_BLOCKER_HALF_WIDTH, TAJ_AUTHORED_BASE_TOP_Y / 2, TAJ_AUTHORED_STAIR_DEPTH / 2] as [number, number, number],
  position: [side * RAMP_CENTER_X, TAJ_AUTHORED_BASE_TOP_Y / 2, TAJ_AUTHORED_STAIR_CENTER_Z] as [number, number, number],
}));

export const TAJ_UNLOCKED_STAIR_RAMP_SPECS = [-1, 1].map((side) => ({
  side,
  args: [RAMP_LENGTH / 2, RAMP_FILL_THICKNESS / 2, TAJ_AUTHORED_STAIR_DEPTH / 2] as [number, number, number],
  // Offset the thick body down-and-outward along its own local "down" so the
  // top face still runs exactly from (APPROACH_X, 0) to (INNER_X, BASE_TOP_Y).
  position: [
    side * (RAMP_CENTER_X - (RAMP_FILL_THICKNESS / 2) * Math.sin(RAMP_ANGLE)),
    TAJ_AUTHORED_BASE_TOP_Y / 2 - (RAMP_FILL_THICKNESS / 2) * Math.cos(RAMP_ANGLE),
    TAJ_AUTHORED_STAIR_CENTER_Z,
  ] as [number, number, number],
  rotation: [0, 0, -side * RAMP_ANGLE] as [number, number, number],
}));

/**
 * Traversal for the base that is already part of the Taj asset.
 *
 * The stairs remain the original GLB geometry — no duplicate stair mesh is
 * created. Before six memories are recovered, blockers fill only the two
 * visible stair recesses. Afterwards those blockers are replaced by hidden
 * ramps under each flight, letting the capsule climb without a jump or step-up
 * mechanic. The base proxy remains permanent collision for the marble plinth.
 */
export function TajApproachStairs() {
  const completedSpatial = useMemoryStore((state) => deriveCompletedIds(state.phases).length);
  const completedProduction = useMemoryRuntimeCompletedCount();
  const unlocked = isFinalMemoryApproachUnlocked(
    completedSpatial,
    completedProduction,
  );

  return (
    <>
      {/* Solid proxy follows the authored GLB base but leaves its two stair recesses open. */}
      <RigidBody type="fixed" colliders={false} name="TajAuthoredBaseCollision">
        <CuboidCollider
          args={[BASE_HALF_SIZE, TAJ_AUTHORED_BASE_TOP_Y / 2, REAR_DECK_DEPTH / 2]}
          position={[0, TAJ_AUTHORED_BASE_TOP_Y / 2, BASE_BACK_Z + REAR_DECK_DEPTH / 2]}
          friction={0.18}
        />
        {[-1, 1].map((side) => (
          <CuboidCollider
            key={side}
            args={[OUTER_WALL_WIDTH / 2, TAJ_AUTHORED_BASE_TOP_Y / 2, FRONT_BAND_DEPTH / 2]}
            position={[
              side * (BASE_HALF_SIZE - OUTER_WALL_WIDTH / 2),
              TAJ_AUTHORED_BASE_TOP_Y / 2,
              STAIR_BACK_Z + FRONT_BAND_DEPTH / 2,
            ]}
            friction={0.18}
          />
        ))}
        <CuboidCollider
          args={[CENTER_WALL_WIDTH / 2, TAJ_AUTHORED_BASE_TOP_Y / 2, FRONT_BAND_DEPTH / 2]}
          position={[0, TAJ_AUTHORED_BASE_TOP_Y / 2, STAIR_BACK_Z + FRONT_BAND_DEPTH / 2]}
          friction={0.18}
        />
      </RigidBody>

      {!unlocked && TAJ_LOCKED_STAIR_BLOCKER_SPECS.map((spec) => (
        <RigidBody key={spec.side} type="fixed" colliders={false} name={`LockedTajAuthoredStairFlight${spec.side}`}>
          <CuboidCollider
            args={spec.args}
            position={spec.position}
            friction={0.18}
          />
        </RigidBody>
      ))}

      {unlocked && TAJ_UNLOCKED_STAIR_RAMP_SPECS.map((spec) => (
        <RigidBody key={spec.side} type="fixed" colliders={false} name={`UnlockedTajAuthoredStairFlight${spec.side}`}>
          <CuboidCollider
            args={spec.args}
            position={spec.position}
            rotation={spec.rotation}
            friction={0.2}
          />
        </RigidBody>
      ))}
    </>
  );
}
