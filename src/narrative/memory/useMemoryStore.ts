import { create } from 'zustand';
import { DOOR_UNLOCK_THRESHOLD, MEMORY_DEFINITIONS } from './definitions';
import { nextPhase } from './stateMachine';
import { isDoorUnlocked } from './progression';
import { MEMORY_IDS, type MemoryId, type MemoryPhase } from './types';

interface MemoryStoreState {
  phases: Record<MemoryId, MemoryPhase>;
  cue: (id: MemoryId) => void;
  engage: (id: MemoryId) => void;
  cancel: (id: MemoryId) => void;
  reveal: (id: MemoryId) => void;
  /** Deterministic + idempotent: completing an already-complete memory is a no-op (Part 4). */
  complete: (id: MemoryId) => void;
  /** Restores completed memories from the versioned save WITHOUT replaying their interactions (Part 4/7). */
  restoreCompleted: (ids: MemoryId[]) => void;
  completedIds: () => MemoryId[];
  isDoorUnlocked: () => boolean;
  reset: () => void;
}

function initialPhases(): Record<MemoryId, MemoryPhase> {
  return MEMORY_IDS.reduce(
    (acc, id) => {
      acc[id] = 'idle';
      return acc;
    },
    {} as Record<MemoryId, MemoryPhase>,
  );
}

function applyEvent(id: MemoryId, event: Parameters<typeof nextPhase>[1]) {
  return (state: MemoryStoreState): Partial<MemoryStoreState> => ({
    phases: { ...state.phases, [id]: nextPhase(state.phases[id], event) },
  });
}

/**
 * Pure — derives completed ids from a `phases` snapshot rather than the
 * live store. Used both by the store's own `completedIds()` and by
 * subscribers (e.g. the save system) that need to diff two snapshots;
 * a method that closes over `get()` would return the same (current) answer
 * for both the old and new snapshot, defeating the diff.
 */
export function deriveCompletedIds(phases: Record<MemoryId, MemoryPhase>): MemoryId[] {
  return MEMORY_IDS.filter((id) => phases[id] === 'complete');
}

export const useMemoryStore = create<MemoryStoreState>((set, get) => ({
  phases: initialPhases(),
  cue: (id) => set(applyEvent(id, 'cue')),
  engage: (id) => set(applyEvent(id, 'engage')),
  cancel: (id) => set(applyEvent(id, 'cancel')),
  reveal: (id) => set(applyEvent(id, 'reveal')),
  complete: (id) => set(applyEvent(id, 'complete')),
  restoreCompleted: (ids) =>
    set((state) => {
      const phases = { ...state.phases };
      for (const id of ids) phases[id] = 'complete';
      return { phases };
    }),
  completedIds: () => deriveCompletedIds(get().phases),
  isDoorUnlocked: () => isDoorUnlocked(get().completedIds().length, DOOR_UNLOCK_THRESHOLD),
  reset: () => set({ phases: initialPhases() }),
}));

export { MEMORY_DEFINITIONS, DOOR_UNLOCK_THRESHOLD };
