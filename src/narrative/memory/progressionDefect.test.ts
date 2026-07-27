import { beforeEach, describe, expect, it } from 'vitest';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { MINTS_MEMORY } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BACK_MEMORY } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_MEMORY } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { LITTLE_DETAILS_MEMORY } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { isMausoleumDoorUnlocked } from './memoryProgress';
import { DOOR_UNLOCK_THRESHOLD } from './definitions';
import { useMemoryStore } from './useMemoryStore';
import { MEMORY_IDS } from './types';

/**
 * Phase 10E — the seam between the two memory systems, kept under test.
 *
 * The **progression defect is fixed**: the mausoleum door now composes both
 * systems through `isMausoleumDoorUnlocked`, and that is asserted here and in
 * `memoryProgress.test.ts`.
 *
 * What these tests guard is the *structural* seam that remains: two id spaces,
 * two ledgers, two save fields. That seam is deliberate for now — merging the
 * identities is content work, not engineering (see the Phase 10E report) — but
 * it must not drift silently. If a future change bridges or breaks it, these
 * fail and someone has to think about it.
 */
const PRODUCTION_MEMORIES = [
  MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY,
  ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY,
];

describe('Phase 10E — the memory-system seam', () => {
  beforeEach(() => {
    useMemoryStore.getState().reset();
    memoryRuntime.reset();
  });

  it('FIXED: completing every production memory now opens the door', () => {
    memoryRuntime.restore(PRODUCTION_MEMORIES.map((memory) => memory.id), [], null);

    // The spine ledger is still empty — the two remain separate stores…
    expect(useMemoryStore.getState().completedIds()).toHaveLength(0);
    expect(useMemoryStore.getState().isDoorUnlocked()).toBe(false);

    // …but the gate the door actually reads composes both.
    expect(isMausoleumDoorUnlocked(
      useMemoryStore.getState().completedIds().length,
      memoryRuntime.getCompletedIds().length,
    )).toBe(true);
  });

  it('FIXED: the spine path still opens the door on its own', () => {
    for (const id of MEMORY_IDS.slice(0, DOOR_UNLOCK_THRESHOLD)) {
      const store = useMemoryStore.getState();
      store.cue(id); store.engage(id); store.reveal(id); store.complete(id);
    }
    expect(isMausoleumDoorUnlocked(
      useMemoryStore.getState().completedIds().length,
      memoryRuntime.getCompletedIds().length,
    )).toBe(true);
  });

  /**
   * `useMemoryStore.isDoorUnlocked()` is intentionally left spine-only: it is
   * the *spine's* view of itself, not the world's gate. Nothing but tests reads
   * it now. Kept so the composition above stays visible as a composition.
   */
  it('leaves the spine store honest about its own scope', () => {
    memoryRuntime.restore(PRODUCTION_MEMORIES.map((memory) => memory.id), [], null);
    expect(useMemoryStore.getState().isDoorUnlocked()).toBe(false);
  });

  it('keeps the two id spaces disjoint, so nothing bridges them by accident', () => {
    const spine = new Set<string>(MEMORY_IDS);
    for (const memory of PRODUCTION_MEMORIES) expect(spine.has(memory.id)).toBe(false);
  });

  it('still persists both ledgers separately — the seam is in the save format', async () => {
    const { createDefaultSave } = await import('@core/save/schema');
    const save = createDefaultSave();
    expect(save).toHaveProperty('completedMemoryIds');
    expect(save).toHaveProperty('runtimeCompletedMemoryIds');
  });
});
