import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionRuntime } from '@core/interaction/InteractionRuntime';
import { MemoryRuntime } from './MemoryRuntime';
import { OwnershipManager } from './OwnershipManager';
import { WorldActionRegistry } from './WorldActionRegistry';
import { BACK_INTERACTION_ID, BACK_MEMORY, BACK_MEMORY_ID, BACK_WORLD_ACTION_ID } from './backMemoryDefinition';

describe('production Memory 2 — A Touch of Sanity', () => {
  let ownership: OwnershipManager; let actions: WorldActionRegistry; let runtime: MemoryRuntime; let returnActive: boolean;
  beforeEach(() => {
    ownership = new OwnershipManager(); actions = new WorldActionRegistry(); returnActive = false;
    actions.register(BACK_WORLD_ACTION_ID, ({ payload }) => {
      const previous = returnActive; const active = (payload as { active?: boolean }).active;
      if (typeof active !== 'boolean') throw new Error('bad payload'); returnActive = active;
      return { undo: () => { returnActive = previous; } };
    });
    runtime = new MemoryRuntime(ownership, actions); runtime.registry.register(BACK_MEMORY);
  });
  const enterFirstBeat = () => { expect(runtime.activate(BACK_MEMORY_ID)).toBe(true); runtime.tick(1100); expect(runtime.getSnapshot().stepId).toBe('ordinary-breaks'); };
  const reachBack = () => { enterFirstBeat(); runtime.acknowledge(); runtime.tick(450); expect(runtime.getSnapshot().stepId).toBe('back'); };
  const complete = () => { reachBack(); runtime.acknowledge(); runtime.acknowledge(); };

  it('registers with exact source linkage, replayable completion persistence, and no prerequisites', () => {
    expect(BACK_MEMORY.sourceMemoryId).toBe('memory.back'); expect(BACK_MEMORY.behavior).toBe('replayable'); expect(BACK_MEMORY.persistence).toBe('completion'); expect(BACK_MEMORY.prerequisiteIds ?? []).toEqual([]); expect(runtime.isEligible(BACK_MEMORY_ID)).toBe(true);
  });
  it('acquires every owner and preserves memory context', () => {
    enterFirstBeat(); expect(Object.values(ownership.snapshot()).every((owner) => owner === BACK_MEMORY_ID)).toBe(true);
    expect(runtime.getSnapshot().dialogue?.text).toBe('In the middle of intense company deadlines and project stress, you gently massage my head and feet.');
  });
  it('presents emphasis dialogue step', () => {
    reachBack(); expect(runtime.getSnapshot().dialogue).toMatchObject({ text: 'A touch of sanity.', presentation: 'emphasis' });
    expect(BACK_MEMORY.steps.filter((step) => step.type === 'dialogue').map((step) => step.text)).toEqual([
      'In the middle of intense company deadlines and project stress, you gently massage my head and feet.',
      'A touch of sanity.',
      'It brings me back to peace, easing every bit of tension and reminding me that I am safe with you.',
    ]);
  });
  it('creates a safe checkpoint, applies and resolves one registered return action', () => {
    reachBack(); expect(runtime.getCheckpoint()?.stepId).toBe('before-return'); expect(returnActive).toBe(false);
    runtime.acknowledge(); expect(returnActive).toBe(true); expect(runtime.getSnapshot().stepId).toBe('quiet-significance');
    runtime.acknowledge(); expect(returnActive).toBe(false); expect(actions.getCalls()).toEqual([
      { id: BACK_WORLD_ACTION_ID, memoryId: BACK_MEMORY_ID }, { id: BACK_WORLD_ACTION_ID, memoryId: BACK_MEMORY_ID },
    ]);
  });
  it('persists first completion, deliberately replays, and never duplicates completion state', () => {
    complete(); expect(runtime.getCompletedIds()).toEqual([BACK_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.back.returned']); expect(runtime.isEligible(BACK_MEMORY_ID)).toBe(true);
    complete(); expect(runtime.getCompletedIds()).toEqual([BACK_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.back.returned']);
  });
  it('supports a persisted repeatable interaction, replay prompt, and cooldown', () => {
    const interactions = new InteractionRuntime(); const activate = vi.fn();
    interactions.registry.register({ id: BACK_INTERACTION_ID, type: 'proximity', position: [0, 0, 0], activationDistance: 2, behavior: 'repeatable', persistence: 'completion', cooldownMs: 900, prompt: 'Remember A Touch of Sanity', completedPrompt: 'Replay “A Touch of Sanity”', accessibilityLabel: 'Remember A Touch of Sanity', completion: 'immediate', onActivate: activate });
    const observer = { x: 0, y: 0, z: 0, forwardX: 0, forwardY: 0, forwardZ: 1 };
    interactions.update(observer, 0); interactions.activate(1); expect(interactions.getCompletedIds()).toEqual([BACK_INTERACTION_ID]); expect(interactions.activate(2)).toBe(false);
    interactions.update(observer, 902); expect(interactions.getSnapshot().prompt).toBe('Replay “A Touch of Sanity”'); interactions.activate(903); expect(activate).toHaveBeenCalledTimes(2); expect(interactions.getCompletedIds()).toEqual([BACK_INTERACTION_ID]);
  });
  it('cancels before and after checkpoint, reverses world state, and releases every owner', () => {
    enterFirstBeat(); runtime.cancel(); expect(runtime.getCheckpoint()).toBeNull(); expect(returnActive).toBe(false);
    reachBack(); runtime.acknowledge(); expect(returnActive).toBe(true); runtime.cancel(); expect(returnActive).toBe(false); expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
});
