import { describe, expect, it } from 'vitest';
import { TAJ_AUTHORED_BASE_TOP_Y, TAJ_MAIN_DOOR_Z } from '@constants/tajPlacement';
import { ALL_DAY_CALL_ANCHOR, ALL_DAY_CALL_MEMORY_ID } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BACK_ANCHOR, BACK_MEMORY_ID } from '@core/memoryRuntime/backMemoryDefinition';
import { BOARDING_PASSES_ANCHOR, BOARDING_PASSES_MEMORY_ID } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_ANCHOR, FRIDAY_NIGHT_MEMORY_ID } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { LITTLE_DETAILS_ANCHOR, LITTLE_DETAILS_MEMORY_ID } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { MINTS_ANCHOR, MINTS_MEMORY_ID } from '@core/memoryRuntime/mintsMemoryDefinition';
import { UMBRELLA_ANCHOR, UMBRELLA_MEMORY_ID } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { PRODUCTION_CHIRAG_PLACEMENTS } from './productionChiragPlacement';

const MEMORIES = [
  [MINTS_MEMORY_ID, MINTS_ANCHOR],
  [BOARDING_PASSES_MEMORY_ID, BOARDING_PASSES_ANCHOR],
  [LITTLE_DETAILS_MEMORY_ID, LITTLE_DETAILS_ANCHOR],
  [BACK_MEMORY_ID, BACK_ANCHOR],
  [UMBRELLA_MEMORY_ID, UMBRELLA_ANCHOR],
  [FRIDAY_NIGHT_MEMORY_ID, FRIDAY_NIGHT_ANCHOR],
  [ALL_DAY_CALL_MEMORY_ID, ALL_DAY_CALL_ANCHOR],
] as const;

describe('production memory chirags', () => {
  it('places exactly one chirag beside every production memory', () => {
    expect(PRODUCTION_CHIRAG_PLACEMENTS).toHaveLength(MEMORIES.length);
    expect(new Set(PRODUCTION_CHIRAG_PLACEMENTS.map((placement) => placement.productionMemoryId)).size).toBe(MEMORIES.length);
    for (const [memoryId, anchor] of MEMORIES) {
      const placement = PRODUCTION_CHIRAG_PLACEMENTS.find((candidate) => candidate.productionMemoryId === memoryId);
      expect(placement).toBeDefined();
      expect(Math.hypot(placement!.position[0] - anchor[0], placement!.position[2] - anchor[2])).toBeLessThanOrEqual(3);
    }
  });

  it('grounds the final chirag on the exterior main-door landing', () => {
    const placement = PRODUCTION_CHIRAG_PLACEMENTS.find((candidate) => candidate.productionMemoryId === ALL_DAY_CALL_MEMORY_ID)!;
    expect(placement.position[0]).toBeGreaterThan(ALL_DAY_CALL_ANCHOR[0] - 2.4);
    expect(placement.position[1]).toBe(TAJ_AUTHORED_BASE_TOP_Y);
    expect(placement.position[2]).toBeGreaterThan(ALL_DAY_CALL_ANCHOR[2]);
    expect(placement.position[2]).toBeGreaterThan(TAJ_MAIN_DOOR_Z);
  });
});