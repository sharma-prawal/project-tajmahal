import { describe, expect, it } from 'vitest';
import { GARDEN } from '@constants/world';
import {
  TAJ_AUTHORED_BASE_TOP_Y,
  TAJ_MAIN_DOOR_APPROACH_Z,
  TAJ_MAIN_DOOR_Z,
} from '@constants/tajPlacement';
import { MEMORY_DEFINITIONS } from './definitions';
import { LANDMARK_PLACEMENTS, PLANTING_FOOTPRINTS, flickerOffsetFor } from './landmarkPlacement';
import { MEMORY_IDS } from './types';

describe('memory landmark placement', () => {
  it('gives every memory at least one landmark', () => {
    for (const id of MEMORY_IDS) {
      expect(LANDMARK_PLACEMENTS.some((placement) => placement.memoryId === id)).toBe(true);
    }
  });

  /**
   * The invariant the whole design rests on: a player standing at a lamp must
   * be a player the state machine already considers present. If a landmark
   * drifted outside its own discovery volume it would advertise a memory the
   * player cannot trigger from there — the worst possible failure for a
   * system whose entire job is "walk here".
   */
  it('places every landmark inside its own discovery volume', () => {
    for (const placement of LANDMARK_PLACEMENTS) {
      const definition = MEMORY_DEFINITIONS.find((candidate) => candidate.id === placement.memoryId)!;
      const [x, , z] = placement.position;
      // Horizontal distance: the volume test is 3D, but a standing player's
      // eye height differs from the lamp's base by far less than any radius
      // here, and the lamp is what the player walks to.
      const distance = Math.hypot(x - definition.location.x, z - definition.location.z);
      expect(distance).toBeLessThan(definition.discoveryRadius);
    }
  });

  /**
   * Phase 10D spent a whole phase keeping the Taj sightline clear; a landmark
   * standing in the middle of the central path would undo it.
   */
  it('keeps every landmark clear of the central walkway', () => {
    for (const placement of LANDMARK_PLACEMENTS) {
      expect(Math.abs(placement.position[0])).toBeGreaterThan(GARDEN.mainPathWidth / 2);
    }
  });

  /** Paired configurations must be symmetric about the axis, like everything else here. */
  it('mirrors threshold and gateway pairs about the central axis', () => {
    const paired = LANDMARK_PLACEMENTS.filter((placement) => placement.configuration !== 'single');
    const byMemory = new Map<string, typeof paired>();
    for (const placement of paired) {
      byMemory.set(placement.memoryId, [...(byMemory.get(placement.memoryId) ?? []), placement]);
    }
    expect(byMemory.size).toBe(3); // m3, m6, m7
    for (const [, pair] of byMemory) {
      expect(pair).toHaveLength(2);
      expect(pair[0].position[0]).toBeCloseTo(-pair[1].position[0], 6);
      expect(pair[0].position[1]).toBeCloseTo(pair[1].position[1], 6);
      expect(pair[0].position[2]).toBeCloseTo(pair[1].position[2], 6);
    }
  });

  it('stands every landmark on its own surface, never floating', () => {
    for (const placement of LANDMARK_PLACEMENTS) {
      // Garden 0.012, site datum 0, scaled authored Taj base — nothing in between,
      // and nothing at the greybox spheres' old 1.0-4.7 m float heights.
      expect([0, 0.012, TAJ_AUTHORED_BASE_TOP_Y]).toContain(placement.position[1]);
    }
  });

  /**
   * The bug this phase actually shipped and then caught: m1 and m2's volumes
   * are centred inside 14.8 m authored planting groups, and the first build put
   * both lamps in the middle of them. The capture came back as a wall of
   * leaves. A landmark the planting swallows cannot do its job.
   */
  it('keeps every landmark clear of the authored planting masses', () => {
    for (const placement of LANDMARK_PLACEMENTS) {
      const [x, , z] = placement.position;
      for (const bed of PLANTING_FOOTPRINTS) {
        const inside = x > bed.minX && x < bed.maxX && z > bed.minZ && z < bed.maxZ;
        expect(inside, `${placement.memoryId} at (${x}, ${z}) is inside a planting group`).toBe(false);
      }
    }
  });

  it('stands the m7 pair on the exterior landing', () => {
    const m7 = LANDMARK_PLACEMENTS.filter((placement) => placement.memoryId === 'm7');
    expect(m7).toHaveLength(2);
    for (const placement of m7) {
      expect(placement.position[1]).toBe(TAJ_AUTHORED_BASE_TOP_Y);
      expect(placement.position[2]).toBeGreaterThan(TAJ_MAIN_DOOR_Z);
    }
  });

  it('places m7 at the exterior main-door approach', () => {
    const m7 = MEMORY_DEFINITIONS.find((definition) => definition.id === 'm7')!;
    expect(m7.location.z).toBe(TAJ_MAIN_DOOR_APPROACH_Z);
    expect(m7.discoveryRadius).toBe(4.5);
    expect(m7.location.z).toBeGreaterThan(TAJ_MAIN_DOOR_Z);
  });

  it('leaves the mausoleum doorway unblocked', () => {
    const DOOR_HALF_WIDTH = 2.35 / 2;
    for (const placement of LANDMARK_PLACEMENTS.filter((p) => p.memoryId === 'm7')) {
      expect(Math.abs(placement.position[0])).toBeGreaterThan(DOOR_HALF_WIDTH);
    }
  });

  it('spreads flicker offsets so no two lamps breathe in unison', () => {
    const offsets = LANDMARK_PLACEMENTS.map((_, index) => Number(flickerOffsetFor(index).toFixed(4)));
    expect(new Set(offsets).size).toBe(offsets.length);
  });
});
