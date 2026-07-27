import { describe, expect, it } from 'vitest';
import { migrateSave } from '@core/save/migrations';
import { createDefaultSave, isValidSaveDataV3, SAVE_SCHEMA_VERSION } from '@core/save/schema';
import { MINTS_MEMORY } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BACK_MEMORY } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_MEMORY } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { LITTLE_DETAILS_MEMORY } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import {
  FINAL_MEMORY_APPROACH_THRESHOLD,
  MEMORY_GATE_THRESHOLD,
  SPINE_MEMORY_COUNT,
  isFinalMemoryApproachUnlocked,
  isMausoleumDoorUnlocked,
  memoryGateProgress,
} from './memoryProgress';
import { MEMORY_DEFINITIONS } from './definitions';
import { MEMORY_IDS } from './types';

const PRODUCTION_MEMORIES = [
  MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY,
  ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY,
];

describe('Phase 10E — unified memory progression', () => {
  describe('the defect is closed', () => {
    it('opens the door for a player who completed only production memories', () => {
      expect(isMausoleumDoorUnlocked(0, PRODUCTION_MEMORIES.length)).toBe(true);
    });

    it('still opens the door for a player who completed only spine volumes', () => {
      expect(isMausoleumDoorUnlocked(MEMORY_GATE_THRESHOLD, 0)).toBe(true);
    });

    it('keeps it shut for a player who has done neither enough', () => {
      expect(isMausoleumDoorUnlocked(MEMORY_GATE_THRESHOLD - 1, MEMORY_GATE_THRESHOLD - 1)).toBe(false);
    });
  });

  /**
   * The single safety property of this phase. An architecture change must
   * never lock a player out of the ending they had already earned, so the new
   * gate must dominate the old spine-only one at every possible input.
   */
  describe('monotonicity — no save can regress', () => {
    it('never returns less progress than the old spine-only rule', () => {
      for (let spine = 0; spine <= SPINE_MEMORY_COUNT; spine += 1) {
        for (let production = 0; production <= PRODUCTION_MEMORIES.length; production += 1) {
          expect(memoryGateProgress(spine, production)).toBeGreaterThanOrEqual(spine);
        }
      }
    });

    it('never closes a door the old rule had opened', () => {
      for (let spine = 0; spine <= SPINE_MEMORY_COUNT; spine += 1) {
        for (let production = 0; production <= PRODUCTION_MEMORIES.length; production += 1) {
          const wasUnlocked = spine >= MEMORY_GATE_THRESHOLD;
          if (wasUnlocked) expect(isMausoleumDoorUnlocked(spine, production)).toBe(true);
        }
      }
    });
  });

  /** Sits between a save file and a door — it must never be why a world fails to load. */
  describe('hostile inputs', () => {
    it.each([
      ['negative', -5, -3, 0],
      ['NaN', Number.NaN, Number.NaN, 0],
      ['Infinity', Number.POSITIVE_INFINITY, 0, 0],
      ['fractional', 3.7, 2.2, 3],
    ])('clamps %s input without throwing', (_label, spine, production, expected) => {
      expect(memoryGateProgress(spine, production)).toBe(expected);
    });

    it('treats a corrupted over-count as progress rather than crashing', () => {
      expect(() => isMausoleumDoorUnlocked(999, 999)).not.toThrow();
      expect(isMausoleumDoorUnlocked(999, 999)).toBe(true);
    });
  });

  describe('partial completion across both systems', () => {
    it('does not add the two systems together', () => {
      // 3 + 3 must not reach a threshold of 5: the two sets describe
      // overlapping places, so summing them would double-count.
      expect(memoryGateProgress(3, 3)).toBe(3);
      expect(isMausoleumDoorUnlocked(3, 3)).toBe(false);
    });

    it('takes whichever path the player got furthest along', () => {
      expect(memoryGateProgress(1, 6)).toBe(6);
      expect(memoryGateProgress(6, 1)).toBe(6);
    });
  });

  describe('seventh-memory stair approach', () => {
    it('unlocks after six production memories', () => {
      expect(FINAL_MEMORY_APPROACH_THRESHOLD).toBe(6);
      expect(isFinalMemoryApproachUnlocked(2, 5)).toBe(false);
      expect(isFinalMemoryApproachUnlocked(2, 6)).toBe(true);
    });

    it('also preserves the six-memory spatial path', () => {
      expect(isFinalMemoryApproachUnlocked(5, 0)).toBe(false);
      expect(isFinalMemoryApproachUnlocked(6, 0)).toBe(true);
    });
  });

  describe('data integrity', () => {
    it('keeps both systems at seven memories, which is what makes `max` fair', () => {
      expect(SPINE_MEMORY_COUNT).toBe(7);
      expect(PRODUCTION_MEMORIES).toHaveLength(7);
    });

    it('keeps the two id spaces disjoint', () => {
      const spine = new Set<string>(MEMORY_IDS);
      for (const memory of PRODUCTION_MEMORIES) expect(spine.has(memory.id)).toBe(false);
    });

    it('has no duplicate ids within either system', () => {
      expect(new Set(MEMORY_DEFINITIONS.map((d) => d.id)).size).toBe(MEMORY_DEFINITIONS.length);
      expect(new Set(PRODUCTION_MEMORIES.map((m) => m.id)).size).toBe(PRODUCTION_MEMORIES.length);
    });

    it('keeps the threshold reachable by either system alone', () => {
      expect(MEMORY_GATE_THRESHOLD).toBeLessThanOrEqual(SPINE_MEMORY_COUNT);
      expect(MEMORY_GATE_THRESHOLD).toBeLessThanOrEqual(PRODUCTION_MEMORIES.length);
    });
  });

  /**
   * Phase 10E deliberately ships **no schema bump**: gate progress is derived
   * from the two arrays v3 already stores. These assert that the existing
   * migration path still feeds the new rule correctly, which is the whole
   * reason a v4 was not needed.
   */
  describe('save compatibility — no schema change required', () => {
    it('still writes schema v3', () => {
      expect(SAVE_SCHEMA_VERSION).toBe(3);
      expect(createDefaultSave().schemaVersion).toBe(3);
    });

    it('derives the gate from fields a v1 save migrates into', () => {
      const v1 = {
        schemaVersion: 1,
        currentBeat: 'loading',
        persistedStoryFloor: 0,
        completedMemoryIds: MEMORY_IDS.slice(0, 5),
        lastCheckpoint: { x: 0, y: 0.9, z: -3 },
        reducedMotion: false,
        audioMuted: false,
        savedAt: new Date(0).toISOString(),
      };
      const migrated = migrateSave(v1);
      expect(migrated).not.toBeNull();
      expect(isValidSaveDataV3(migrated)).toBe(true);
      // Five memories no longer skip the authored sixth + Taj seventh sequence.
      expect(isMausoleumDoorUnlocked(
        migrated!.completedMemoryIds.length,
        migrated!.runtimeCompletedMemoryIds.length,
      )).toBe(false);
    });

    it('derives the gate from a v3 save holding only production progress', () => {
      const save = { ...createDefaultSave(), runtimeCompletedMemoryIds: PRODUCTION_MEMORIES.map((m) => m.id) };
      expect(isValidSaveDataV3(save)).toBe(true);
      expect(isMausoleumDoorUnlocked(save.completedMemoryIds.length, save.runtimeCompletedMemoryIds.length)).toBe(true);
    });

    it('falls back to a fresh save on a corrupted blob, leaving the door shut', () => {
      for (const corrupt of [null, undefined, 'nonsense', 42, {}, { schemaVersion: 99 }, { schemaVersion: 3 }]) {
        expect(migrateSave(corrupt)).toBeNull();
      }
      const fresh = createDefaultSave();
      expect(isMausoleumDoorUnlocked(fresh.completedMemoryIds.length, fresh.runtimeCompletedMemoryIds.length)).toBe(false);
    });
  });
});
