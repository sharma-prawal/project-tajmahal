import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionRuntime } from '@core/interaction/InteractionRuntime';
import { MemoryRuntime } from './MemoryRuntime';
import { OwnershipManager } from './OwnershipManager';
import { WorldActionRegistry } from './WorldActionRegistry';
import { LITTLE_DETAILS_INTERACTION_ID, LITTLE_DETAILS_MEMORY, LITTLE_DETAILS_MEMORY_ID, LITTLE_DETAILS_WORLD_ACTION_ID } from './littleDetailsMemoryDefinition';

type Stage = 0 | 1 | 2 | 3;
function registerStageAction(actions: WorldActionRegistry, setStage: (stage: Stage) => void, getStage: () => Stage) {
  return actions.register(LITTLE_DETAILS_WORLD_ACTION_ID, ({ payload }) => { const previous = getStage(); const stage = (payload as { stage?: Stage }).stage; if (stage !== 0 && stage !== 1 && stage !== 2 && stage !== 3) throw new Error('bad stage'); setStage(stage); return { undo: () => setStage(previous) }; });
}

describe('production Memory 5 — The Careless Days', () => {
  let ownership: OwnershipManager; let actions: WorldActionRegistry; let runtime: MemoryRuntime; let stage: Stage;
  beforeEach(() => { ownership = new OwnershipManager(); actions = new WorldActionRegistry(); stage = 0; registerStageAction(actions, (value) => { stage = value; }, () => stage); runtime = new MemoryRuntime(ownership, actions); runtime.registry.register(LITTLE_DETAILS_MEMORY); });
  const firstBeat = () => { expect(runtime.activate(LITTLE_DETAILS_MEMORY_ID)).toBe(true); runtime.tick(1100); expect(runtime.getSnapshot().stepId).toBe('family-categories'); };
  const checkpointOne = () => { firstBeat(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('everything-else'); };
  const checkpointTwo = () => { checkpointOne(); runtime.acknowledge(); runtime.acknowledge(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('effortless-trust'); };
  const finish = () => { checkpointTwo(); runtime.acknowledge(); };

  it('registers with exact source linkage, no prerequisite, and replayable persistence', () => {
    expect(LITTLE_DETAILS_MEMORY.sourceMemoryId).toBe('memory.little-details'); expect(LITTLE_DETAILS_MEMORY.prerequisiteIds ?? []).toEqual([]); expect(LITTLE_DETAILS_MEMORY.behavior).toBe('replayable'); expect(LITTLE_DETAILS_MEMORY.persistence).toBe('completion'); expect(runtime.isEligible(LITTLE_DETAILS_MEMORY_ID)).toBe(true);
  });
  it('acquires every owner and preserves memory context', () => {
    firstBeat(); expect(Object.values(ownership.snapshot()).every((owner) => owner === LITTLE_DETAILS_MEMORY_ID)).toBe(true); const text = runtime.getSnapshot().dialogue?.text ?? '';
    expect(text).toContain('office clothes');
  });
  it('uses approved beats', () => {
    const copy = LITTLE_DETAILS_MEMORY.steps.filter((step) => step.type === 'dialogue').map((step) => step.text);
    expect(copy).toEqual(['You prepare my office clothes so attentively every morning...', '...and keep everything so perfectly sorted for me.', 'You have taken such good care of me that I have become completely spoiled...', '...so spoiled that I do not even know where my own socks are anymore!', 'It is a small daily routine, but it shows how deeply you care for me.']);
  });
  it('progresses one registered action through three absolute stages and clears it', () => {
    checkpointOne(); expect(runtime.getCheckpoint()?.stepId).toBe('after-detail-categories'); expect(stage).toBe(1); runtime.acknowledge(); expect(stage).toBe(2); runtime.acknowledge(); runtime.acknowledge(); expect(runtime.getCheckpoint()?.stepId).toBe('before-complete-pattern'); expect(stage).toBe(3); runtime.acknowledge(); expect(stage).toBe(0);
    expect(new Set(actions.getCalls().map((call) => call.id))).toEqual(new Set([LITTLE_DETAILS_WORLD_ACTION_ID]));
  });
  it('restores Checkpoint 1 with stage 1, camera context, and all owners', () => {
    checkpointOne(); const checkpoint = runtime.getCheckpoint(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage);
    const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], checkpoint); restored.registry.register(LITTLE_DETAILS_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(1); expect(restored.getSnapshot().stepId).toBe('everything-else'); expect(Object.values(restored.getOwnership()).every((owner) => owner === LITTLE_DETAILS_MEMORY_ID)).toBe(true);
  });
  it('restores Checkpoint 2 directly to stable stage 3 and final reflection', () => {
    checkpointTwo(); const checkpoint = runtime.getCheckpoint(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage);
    const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([LITTLE_DETAILS_MEMORY_ID], ['memory.little-details.effortless-trust'], checkpoint); restored.registry.register(LITTLE_DETAILS_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(3); expect(restored.getSnapshot().stepId).toBe('effortless-trust'); expect(Object.values(restored.getOwnership()).every((owner) => owner === LITTLE_DETAILS_MEMORY_ID)).toBe(true);
  });
  it('cancels safely before, between, or after checkpoints and reverses every stage', () => {
    firstBeat(); runtime.cancel(); expect(stage).toBe(0); checkpointOne(); runtime.cancel(); expect(stage).toBe(0); checkpointTwo(); expect(stage).toBe(3); runtime.cancel(); expect(stage).toBe(0); expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
  it('persists completion once and permits deliberate replay without duplication', () => {
    finish(); expect(runtime.getCompletedIds()).toEqual([LITTLE_DETAILS_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.little-details.effortless-trust']); expect(runtime.isEligible(LITTLE_DETAILS_MEMORY_ID)).toBe(true); finish(); expect(runtime.getCompletedIds()).toEqual([LITTLE_DETAILS_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.little-details.effortless-trust']);
  });
  it('provides completed replay prompt and cooldown through the interaction runtime', () => {
    const interactions = new InteractionRuntime(); const activate = vi.fn(); const observer = { x: 0, y: 0, z: 0, forwardX: 0, forwardY: 0, forwardZ: 1 };
    interactions.registry.register({ id: LITTLE_DETAILS_INTERACTION_ID, type: 'proximity', position: [0, 0, 0], activationDistance: 2, behavior: 'repeatable', persistence: 'completion', cooldownMs: 900, prompt: 'Remember The Careless Days', completedPrompt: 'Replay “The Careless Days”', accessibilityLabel: 'Remember The Careless Days', onActivate: activate }); interactions.update(observer, 0); interactions.activate(1); expect(interactions.activate(2)).toBe(false); interactions.update(observer, 902); expect(interactions.getSnapshot().prompt).toBe('Replay “The Careless Days”'); interactions.activate(903); expect(activate).toHaveBeenCalledTimes(2); expect(interactions.getCompletedIds()).toEqual([LITTLE_DETAILS_INTERACTION_ID]);
  });
  it('rejects version mismatch and cleans ownership and stage after action failure', () => {
    runtime.restore([], [], { memoryId: LITTLE_DETAILS_MEMORY_ID, contentVersion: 99, stepId: 'after-detail-categories' }); expect(runtime.tryRestoreCheckpoint()).toBe(false); const brokenActions = new WorldActionRegistry(); brokenActions.register(LITTLE_DETAILS_WORLD_ACTION_ID, () => { throw new Error('stage failed'); }); const broken = new MemoryRuntime(new OwnershipManager(), brokenActions); broken.registry.register(LITTLE_DETAILS_MEMORY); broken.activate(LITTLE_DETAILS_MEMORY_ID); broken.tick(1100); broken.acknowledge(); expect(broken.getSnapshot().lifecycle).toBe('failed'); expect(Object.values(broken.getOwnership()).every((owner) => owner === null)).toBe(true);
  });
});
