import { beforeEach, describe, expect, it } from 'vitest';
import { useMemoryStore } from './useMemoryStore';
import { MEMORY_IDS } from './types';

const initialState = useMemoryStore.getState();

beforeEach(() => {
  useMemoryStore.setState(initialState, true);
  useMemoryStore.getState().reset();
});

describe('useMemoryStore', () => {
  it('starts with every memory idle and nothing completed', () => {
    const state = useMemoryStore.getState();
    for (const id of MEMORY_IDS) expect(state.phases[id]).toBe('idle');
    expect(state.completedIds()).toEqual([]);
    expect(state.isDoorUnlocked()).toBe(false);
  });

  it('walks a single memory through its full lifecycle exactly once', () => {
    const { cue, engage, reveal, complete } = useMemoryStore.getState();
    cue('m1');
    engage('m1');
    reveal('m1');
    complete('m1');
    expect(useMemoryStore.getState().phases.m1).toBe('complete');
    expect(useMemoryStore.getState().completedIds()).toEqual(['m1']);
  });

  it('completion is idempotent — completing twice does not duplicate in completedIds', () => {
    const { cue, engage, reveal, complete } = useMemoryStore.getState();
    cue('m1');
    engage('m1');
    reveal('m1');
    complete('m1');
    complete('m1');
    complete('m1');
    expect(useMemoryStore.getState().completedIds()).toEqual(['m1']);
  });

  it('cancellation returns to idle with no effect on other memories', () => {
    const { cue, engage, cancel } = useMemoryStore.getState();
    cue('m2');
    engage('m2');
    cancel('m2');
    expect(useMemoryStore.getState().phases.m2).toBe('idle');
    expect(useMemoryStore.getState().completedIds()).toEqual([]);
  });

  it('unlocks the door only after all seven memories, not after the first six', () => {
    const { cue, engage, reveal, complete } = useMemoryStore.getState();
    const seven = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'] as const;
    for (const id of seven.slice(0, 6)) {
      cue(id);
      engage(id);
      reveal(id);
      complete(id);
    }
    expect(useMemoryStore.getState().isDoorUnlocked()).toBe(false);

    cue(seven[6]);
    engage(seven[6]);
    reveal(seven[6]);
    complete(seven[6]);
    expect(useMemoryStore.getState().isDoorUnlocked()).toBe(true);
  });

  it('restoreCompleted sets memories directly to complete without replaying the interaction', () => {
    useMemoryStore.getState().restoreCompleted(['m3', 'm6', 'm7']);
    const state = useMemoryStore.getState();
    expect(state.phases.m3).toBe('complete');
    expect(state.phases.m6).toBe('complete');
    expect(state.phases.m7).toBe('complete');
    expect(state.completedIds().sort()).toEqual(['m3', 'm6', 'm7']);
  });

  it('restoreCompleted is idempotent and safe to call again on an already-complete memory', () => {
    const { complete, restoreCompleted } = useMemoryStore.getState();
    complete('m1'); // no-op, m1 is idle -> cue not called, stays idle per state machine (complete only from revealing)
    restoreCompleted(['m1']);
    restoreCompleted(['m1']);
    expect(useMemoryStore.getState().phases.m1).toBe('complete');
    expect(useMemoryStore.getState().completedIds()).toEqual(['m1']);
  });

  it('reset clears all progress', () => {
    useMemoryStore.getState().restoreCompleted(['m1', 'm2']);
    useMemoryStore.getState().reset();
    const state = useMemoryStore.getState();
    expect(state.completedIds()).toEqual([]);
    for (const id of MEMORY_IDS) expect(state.phases[id]).toBe('idle');
  });
});
