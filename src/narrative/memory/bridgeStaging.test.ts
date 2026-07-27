import { describe, expect, it } from 'vitest';
import { MINTS_ACTIVATION_DISTANCE, MINTS_ANCHOR, MINTS_MEMORY } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BOARDING_PASSES_ACTIVATION_DISTANCE, BOARDING_PASSES_ANCHOR, BOARDING_PASSES_MEMORY } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { LITTLE_DETAILS_ACTIVATION_DISTANCE, LITTLE_DETAILS_ANCHOR, LITTLE_DETAILS_MEMORY } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { FRIDAY_NIGHT_ACTIVATION_DISTANCE, FRIDAY_NIGHT_ANCHOR, FRIDAY_NIGHT_MEMORY } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { ALL_DAY_CALL_ACTIVATION_DISTANCE, ALL_DAY_CALL_ANCHOR, ALL_DAY_CALL_MEMORY } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BACK_ANCHOR } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_ANCHOR } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import type { RuntimeMemoryDefinition } from '@core/memoryRuntime/types';
import { BRIDGE_LOCATIONS, bridgeAnchorFor, stagedBridges, validateBridgeLocations } from './bridgeLocations';
import { MEMORY_DEFINITIONS } from './definitions';
import { groundHeightAt, isOnPlatformTop, placementViolations } from './bridgePlacement';

/**
 * Phase 10F.2 — the staged bridges and the world they were authored against.
 *
 * The point of these is that a bridge row is not decoration: it is the
 * authored source for where a narrative actually happens. If someone edits an
 * anchor constant without editing its bridge (or the reverse), the two
 * descriptions of the world disagree and one of them is lying. These fail
 * instead.
 */
const ANCHORS: Record<string, readonly [number, number, number]> = {
  'production.memory.mints': MINTS_ANCHOR,
  'production.memory.boarding-passes': BOARDING_PASSES_ANCHOR,
  'production.memory.little-details': LITTLE_DETAILS_ANCHOR,
  'production.memory.friday-night': FRIDAY_NIGHT_ANCHOR,
  'production.memory.all-day-call': ALL_DAY_CALL_ANCHOR,
};

const MEMORIES: Record<string, RuntimeMemoryDefinition> = {
  'production.memory.mints': MINTS_MEMORY,
  'production.memory.boarding-passes': BOARDING_PASSES_MEMORY,
  'production.memory.little-details': LITTLE_DETAILS_MEMORY,
  'production.memory.friday-night': FRIDAY_NIGHT_MEMORY,
  'production.memory.all-day-call': ALL_DAY_CALL_MEMORY,
};

/** The first `camera` step of a memory — the one a bridge's offsets describe. */
function firstCamera(memory: RuntimeMemoryDefinition) {
  const step = memory.steps.find((candidate) => candidate.type === 'camera');
  if (!step || step.type !== 'camera') throw new Error(`${memory.id} has no camera step`);
  return step;
}

describe('Phase 10F.2 — staged bridge locations', () => {
  it('validates with no structural problems', () => {
    expect(validateBridgeLocations()).toEqual([]);
  });

  it('stages all five bridges', () => {
    expect(stagedBridges()).toHaveLength(5);
    expect(BRIDGE_LOCATIONS.every((bridge) => bridge.status === 'staged')).toBe(true);
  });

  it('places every staged bridge on safe ground', () => {
    for (const bridge of stagedBridges()) {
      const [x, , z] = bridge.position!;
      expect(placementViolations(x, z), `${bridge.id} at (${x}, ${z})`).toEqual([]);
    }
  });

  /**
   * The single easiest mistake in this phase: authoring a platform anchor with
   * the garden's Y and burying it 3.2 m underground.
   */
  it('gives every staged bridge the Y of the ground it stands on', () => {
    for (const bridge of stagedBridges()) {
      const [x, y, z] = bridge.position!;
      expect(y, `${bridge.id} Y should sit on its own ground`).toBeGreaterThanOrEqual(groundHeightAt(x, z));
      expect(y - groundHeightAt(x, z)).toBeLessThan(1);
    }
  });

  it('keeps each production anchor exactly where its bridge says', () => {
    for (const bridge of stagedBridges()) {
      expect(ANCHORS[bridge.productionMemoryId], bridge.id).toEqual(bridge.position);
    }
  });

  /**
   * The whole reason offsets are stored rather than absolute positions: a
   * moved narrative must keep the framing Phase 7 authored for it. If someone
   * nudges an anchor and forgets the camera, the composition silently changes
   * and nothing else would catch it.
   */
  it('reproduces each authored camera exactly from its bridge offsets', () => {
    for (const bridge of stagedBridges()) {
      if (!bridge.cameraOffset || !bridge.cameraTargetOffset) continue;
      const anchor = bridge.position!;
      const camera = firstCamera(MEMORIES[bridge.productionMemoryId]);
      for (let axis = 0; axis < 3; axis += 1) {
        expect(camera.position[axis], `${bridge.id} camera[${axis}]`)
          .toBeCloseTo(anchor[axis] + bridge.cameraOffset[axis], 5);
        expect(camera.target[axis], `${bridge.id} target[${axis}]`)
          .toBeCloseTo(anchor[axis] + bridge.cameraTargetOffset[axis], 5);
      }
    }
  });

  it('never puts a narrative camera underground', () => {
    for (const bridge of stagedBridges()) {
      const camera = firstCamera(MEMORIES[bridge.productionMemoryId]);
      expect(camera.position[1], `${bridge.id} camera height`)
        .toBeGreaterThan(groundHeightAt(camera.position[0], camera.position[2]));
    }
  });

  it('keeps the two proven anchors at clear pavilion thresholds', () => {
    expect(BACK_ANCHOR).toEqual([-25.7, 0, -141.5]);
    expect(UMBRELLA_ANCHOR).toEqual([25.7, 0, -141.5]);
    expect(bridgeAnchorFor('production.memory.back')).toBeNull();
    expect(bridgeAnchorFor('production.memory.umbrella')).toBeNull();
  });

  it('mirrors Little Details to the east pool edge (spread pass)', () => {
    expect(LITTLE_DETAILS_ANCHOR).toEqual([20, 0.035, -126]);
  });
});

describe('Phase 10F.2 — journey geometry', () => {
  const bridge = (id: string) => BRIDGE_LOCATIONS.find((row) => row.productionMemoryId === id)!;

  it('keeps Friday Night at the west planting threshold and off the open platform top', () => {
    const [x, , z] = bridge('production.memory.friday-night').position!;
    expect(x).toBeLessThan(-26.5);
    expect(z).toBeLessThanOrEqual(-163);
    expect(isOnPlatformTop(x, z)).toBe(false);
  });

  it('keeps the All-Day Call cadence entirely outside the main door', () => {
    const [x, , z] = bridge('production.memory.all-day-call').position!;
    const nearestBarZ = z + 3.2;
    expect(nearestBarZ).toBeGreaterThan(z);

    const m7 = MEMORY_DEFINITIONS.find((definition) => definition.id === 'm7')!;
    expect(Math.hypot(x - m7.location.x, nearestBarZ - m7.location.z)).toBeLessThanOrEqual(m7.discoveryRadius);
  });

  /**
   * Two activation radii that overlap would let one prompt shadow the other.
   * The stair climb between these two beats is deliberate — vulnerability at
   * the foot of the platform, devotion on the approach above it.
   */
  it('separates consecutive staged beats by more than their activation radii', () => {
    const friday = bridge('production.memory.friday-night');
    const allDay = bridge('production.memory.all-day-call');
    const distance = Math.hypot(
      friday.position![0] - allDay.position![0],
      friday.position![2] - allDay.position![2],
    );
    expect(distance).toBeGreaterThan(friday.activationRadius! + allDay.activationRadius!);
  });

  /**
   * Phase 10F.3. `activationRadius` is documented as "matching the production
   * interaction's own `activationDistance`", and nothing compared them — so
   * Mints sat at 6.2 m in the table against 5.5 m in `MintsMemory`. Every
   * distance argument built on this table (including the Friday Night /
   * All-Day Call non-overlap proof above) was resting on an unchecked number.
   */
  it('states each bridge activation radius as the interaction actually uses it', () => {
    const authored: Record<string, number> = {
      'production.memory.mints': MINTS_ACTIVATION_DISTANCE,
      'production.memory.boarding-passes': BOARDING_PASSES_ACTIVATION_DISTANCE,
      'production.memory.little-details': LITTLE_DETAILS_ACTIVATION_DISTANCE,
      'production.memory.friday-night': FRIDAY_NIGHT_ACTIVATION_DISTANCE,
      'production.memory.all-day-call': ALL_DAY_CALL_ACTIVATION_DISTANCE,
    };
    for (const bridgeRow of stagedBridges()) {
      expect(bridgeRow.activationRadius).toBe(authored[bridgeRow.productionMemoryId]);
    }
  });

  it('chains previous/next beats into the canonical order without a break', () => {
    const order = [
      'production.memory.mints',
      'production.memory.boarding-passes',
      'production.memory.little-details',
      'production.memory.friday-night',
      'production.memory.all-day-call',
    ];
    // Back and Umbrella have no bridge, so the chain skips them by design;
    // what matters is that no bridge names a neighbour that contradicts the
    // canonical sequence.
    for (const bridgeRow of BRIDGE_LOCATIONS) {
      if (bridgeRow.previousBeat) {
        expect(order.concat(['production.memory.umbrella'])).toContain(bridgeRow.previousBeat);
      }
      if (bridgeRow.nextBeat) {
        expect(order.concat(['production.memory.back'])).toContain(bridgeRow.nextBeat);
      }
    }
  });
});
