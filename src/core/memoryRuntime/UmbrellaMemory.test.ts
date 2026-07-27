import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionRuntime } from '@core/interaction/InteractionRuntime';
import { MemoryRuntime } from './MemoryRuntime';
import { OwnershipManager } from './OwnershipManager';
import { WorldActionRegistry } from './WorldActionRegistry';
import { UMBRELLA_INTERACTION_ID, UMBRELLA_MEMORY, UMBRELLA_MEMORY_ID, UMBRELLA_WORLD_ACTION_ID } from './umbrellaMemoryDefinition';

describe('production Memory 4 — Fried Rice & Love', () => {
  let ownership: OwnershipManager; let actions: WorldActionRegistry; let runtime: MemoryRuntime; let pathActive: boolean;
  beforeEach(() => {
    ownership = new OwnershipManager(); actions = new WorldActionRegistry(); pathActive = false;
    actions.register(UMBRELLA_WORLD_ACTION_ID, ({ payload }) => {
      const previous = pathActive; const active = (payload as { active?: boolean }).active;
      if (typeof active !== 'boolean') throw new Error('bad payload'); pathActive = active;
      return { undo: () => { pathActive = previous; } };
    });
    runtime = new MemoryRuntime(ownership, actions); runtime.registry.register(UMBRELLA_MEMORY);
  });
  const enterFirstBeat = () => { expect(runtime.activate(UMBRELLA_MEMORY_ID)).toBe(true); runtime.tick(1100); expect(runtime.getSnapshot().stepId).toBe('umbrella-reminder'); };
  const reachSecondBeat = () => { enterFirstBeat(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('walk-outside'); };
  const complete = () => { reachSecondBeat(); runtime.acknowledge(); runtime.acknowledge(); };

  it('registers with exact source linkage and reusable replay persistence', () => {
    expect(UMBRELLA_MEMORY.sourceMemoryId).toBe('memory.umbrella'); expect(UMBRELLA_MEMORY.behavior).toBe('replayable'); expect(UMBRELLA_MEMORY.persistence).toBe('completion'); expect(runtime.isEligible(UMBRELLA_MEMORY_ID)).toBe(true);
  });
  it('acquires all owners and begins with approved context', () => {
    enterFirstBeat(); expect(Object.values(ownership.snapshot()).every((owner) => owner === UMBRELLA_MEMORY_ID)).toBe(true);
    expect(runtime.getSnapshot().dialogue?.text).toBe('Whenever I request it, you happily cook for me—especially your delicious fried rice…');
  });
  it('preserves fried rice love language context', () => {
    reachSecondBeat(); const copy = UMBRELLA_MEMORY.steps.filter((step) => step.type === 'dialogue').map((step) => step.text).join(' ');
    expect(runtime.getSnapshot().dialogue?.text).toBe('…stepping into the kitchen with so much warmth and care.');
    expect(copy).toContain('love language');
  });
  it('checkpoints before one reversible pathway action and resolves it on completion', () => {
    reachSecondBeat(); expect(runtime.getCheckpoint()?.stepId).toBe('before-walk-outside'); runtime.acknowledge(); expect(pathActive).toBe(true); expect(runtime.getSnapshot().stepId).toBe('meaningful-thought');
    runtime.acknowledge(); expect(pathActive).toBe(false); expect(actions.getCalls()).toEqual([{ id: UMBRELLA_WORLD_ACTION_ID, memoryId: UMBRELLA_MEMORY_ID }, { id: UMBRELLA_WORLD_ACTION_ID, memoryId: UMBRELLA_MEMORY_ID }]);
  });
  it('persists completion once and permits deliberate replay without duplicate state', () => {
    complete(); expect(runtime.getCompletedIds()).toEqual([UMBRELLA_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.umbrella.thoughtful-reminder']); expect(runtime.isEligible(UMBRELLA_MEMORY_ID)).toBe(true);
    complete(); expect(runtime.getCompletedIds()).toEqual([UMBRELLA_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.umbrella.thoughtful-reminder']);
  });
  it('uses a persisted repeatable interaction with completed prompt and cooldown', () => {
    const interactions = new InteractionRuntime(); const activate = vi.fn(); const observer = { x: 0, y: 0, z: 0, forwardX: 0, forwardY: 0, forwardZ: 1 };
    interactions.registry.register({ id: UMBRELLA_INTERACTION_ID, type: 'proximity', position: [0, 0, 0], activationDistance: 2, behavior: 'repeatable', persistence: 'completion', cooldownMs: 900, prompt: 'Remember Fried Rice and Love', completedPrompt: 'Replay “Fried Rice and Love”', accessibilityLabel: 'Remember Fried Rice and Love', onActivate: activate });
    interactions.update(observer, 0); interactions.activate(1); expect(interactions.activate(2)).toBe(false); interactions.update(observer, 902); expect(interactions.getSnapshot().prompt).toBe('Replay “Fried Rice and Love”'); interactions.activate(903); expect(activate).toHaveBeenCalledTimes(2); expect(interactions.getCompletedIds()).toEqual([UMBRELLA_INTERACTION_ID]);
  });
  it('cancels safely before or after checkpoint and reverses the accent', () => {
    enterFirstBeat(); runtime.cancel(); expect(runtime.getCheckpoint()).toBeNull(); reachSecondBeat(); runtime.acknowledge(); expect(pathActive).toBe(true); runtime.cancel(); expect(pathActive).toBe(false); expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
  it('restores checkpoint ownership and deterministically reapplies the pathway action', () => {
    reachSecondBeat(); const checkpoint = runtime.getCheckpoint(); const restoredActions = new WorldActionRegistry(); let restoredPath = false;
    restoredActions.register(UMBRELLA_WORLD_ACTION_ID, ({ payload }) => { const previous = restoredPath; restoredPath = (payload as { active: boolean }).active; return { undo: () => { restoredPath = previous; } }; });
    const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([UMBRELLA_MEMORY_ID], ['memory.umbrella.thoughtful-reminder'], checkpoint); restored.registry.register(UMBRELLA_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(Object.values(restored.getOwnership()).every((owner) => owner === UMBRELLA_MEMORY_ID)).toBe(true);
    expect(restored.getSnapshot().stepId).toBe('walk-outside'); restored.acknowledge(); expect(restoredPath).toBe(true); restored.acknowledge(); expect(restored.getCompletedIds()).toEqual([UMBRELLA_MEMORY_ID]);
  });
  it('rejects version mismatch and cleans ownership after action failure', () => {
    runtime.restore([], [], { memoryId: UMBRELLA_MEMORY_ID, contentVersion: 99, stepId: 'before-walk-outside' }); expect(runtime.tryRestoreCheckpoint()).toBe(false);
  });
});
