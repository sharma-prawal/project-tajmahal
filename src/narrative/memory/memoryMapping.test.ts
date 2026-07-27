import { beforeEach, describe, expect, it } from 'vitest';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { BACK_MEMORY_ID } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_MEMORY_ID } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { MINTS_MEMORY_ID } from '@core/memoryRuntime/mintsMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY_ID } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { SAVE_SCHEMA_VERSION } from '@core/save/schema';
import {
  MEMORY_MAPPING,
  provenMappings,
  spatialMemoryForProduction,
  validateMemoryMapping,
} from './memoryMapping';
import { useMemoryStore } from './useMemoryStore';
import { LANDMARK_PLACEMENTS } from './landmarkPlacement';
import { isMausoleumDoorUnlocked } from './memoryProgress';
import type { MemoryId } from './types';

/** What the bridge component does, extracted so it can be tested without a canvas. */
function syncBridge(): void {
  const store = useMemoryStore.getState();
  const newlyComplete = memoryRuntime
    .getCompletedIds()
    .map(spatialMemoryForProduction)
    .filter((id): id is MemoryId => id !== null && store.phases[id] !== 'complete');
  if (newlyComplete.length > 0) store.restoreCompleted(newlyComplete);
}

describe('memory mapping contract', () => {
  it('covers all seven narratives exactly once', () => {
    expect(MEMORY_MAPPING).toHaveLength(7);
    expect(new Set(MEMORY_MAPPING.map((row) => row.productionMemoryId)).size).toBe(7);
  });

  it('is structurally valid', () => {
    expect(validateMemoryMapping()).toEqual([]);
  });

  it('wires only the two proven pairings', () => {
    expect(provenMappings().map((row) => [row.productionMemoryId, row.spatialMemoryId])).toEqual([
      [BACK_MEMORY_ID, 'm4'],
      [UMBRELLA_MEMORY_ID, 'm5'],
    ]);
  });

  /**
   * The rule that makes this contract worth having. A nearest-anchor heuristic
   * would have confidently mapped all seven; five of those would have been
   * invented. `unknown` and `ambiguous` must stay unmapped.
   */
  it('never names a spatial memory for an unproven row', () => {
    for (const row of MEMORY_MAPPING) {
      if (row.mappingStatus !== 'proven') expect(row.spatialMemoryId).toBeNull();
    }
  });

  it('claims each spine memory at most once', () => {
    const claimed = provenMappings().map((row) => row.spatialMemoryId);
    expect(new Set(claimed).size).toBe(claimed.length);
  });

  it('gives every proven mapping a landmark to light', () => {
    const owners = new Set(LANDMARK_PLACEMENTS.map((placement) => placement.memoryId));
    for (const row of provenMappings()) expect(owners.has(row.spatialMemoryId!)).toBe(true);
  });

  it('records a rationale for every row, including the undecided ones', () => {
    for (const row of MEMORY_MAPPING) expect(row.designRationale.length).toBeGreaterThan(40);
  });

  it('resolves unknown production ids to null rather than throwing', () => {
    expect(spatialMemoryForProduction('production.memory.does-not-exist')).toBeNull();
    expect(spatialMemoryForProduction('')).toBeNull();
  });
});

describe('completion bridge — production narrative lights its landmark', () => {
  beforeEach(() => {
    useMemoryStore.getState().reset();
    memoryRuntime.reset();
  });

  /**
   * This test exists because the first implementation called
   * `useMemoryStore.complete()`, which `nextPhase` only accepts from
   * `revealing` — so it was a silent no-op from `idle` and no lamp would ever
   * have lit. Nothing else in the suite would have caught it.
   */
  it('completes the mapped spine memory from a cold idle phase', () => {
    expect(useMemoryStore.getState().phases.m4).toBe('idle');
    memoryRuntime.restore([BACK_MEMORY_ID], [], null);
    syncBridge();
    expect(useMemoryStore.getState().phases.m4).toBe('complete');
  });

  it('lights both proven landmarks independently', () => {
    memoryRuntime.restore([UMBRELLA_MEMORY_ID], [], null);
    syncBridge();
    expect(useMemoryStore.getState().phases.m5).toBe('complete');
    expect(useMemoryStore.getState().phases.m4).toBe('idle');
  });

  it('changes no landmark for an unmapped narrative', () => {
    memoryRuntime.restore([MINTS_MEMORY_ID, FRIDAY_NIGHT_MEMORY_ID], [], null);
    syncBridge();
    expect(useMemoryStore.getState().completedIds()).toEqual([]);
  });

  it('is idempotent across repeated syncs', () => {
    memoryRuntime.restore([BACK_MEMORY_ID], [], null);
    for (let i = 0; i < 5; i += 1) syncBridge();
    expect(useMemoryStore.getState().completedIds()).toEqual(['m4']);
  });

  it('never regresses a completed landmark when the runtime is later cleared', () => {
    memoryRuntime.restore([BACK_MEMORY_ID], [], null);
    syncBridge();
    memoryRuntime.reset(); // e.g. a cancelled replay clearing runtime state
    syncBridge();
    expect(useMemoryStore.getState().phases.m4).toBe('complete');
  });

  /** One-way only: a spine completion must never fabricate a narrative. */
  it('does not write back into the production runtime', () => {
    const store = useMemoryStore.getState();
    store.restoreCompleted(['m4', 'm5']);
    syncBridge();
    expect(memoryRuntime.getCompletedIds()).toEqual([]);
  });

  it('handles a runtime holding an id the contract does not know', () => {
    memoryRuntime.restore(['production.memory.removed-in-a-later-phase'], [], null);
    expect(() => syncBridge()).not.toThrow();
    expect(useMemoryStore.getState().completedIds()).toEqual([]);
  });

  it('contributes to the door without double-counting', () => {
    memoryRuntime.restore([BACK_MEMORY_ID, UMBRELLA_MEMORY_ID], [], null);
    syncBridge();
    // 2 spine + 2 production — `max` keeps this at 2, not 4.
    expect(useMemoryStore.getState().completedIds()).toHaveLength(2);
    expect(isMausoleumDoorUnlocked(2, 2)).toBe(false);
  });

  it('introduces no save-schema change', () => {
    expect(SAVE_SCHEMA_VERSION).toBe(3);
  });
});
