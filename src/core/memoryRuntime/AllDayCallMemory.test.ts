import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionRuntime } from '@core/interaction/InteractionRuntime';
import { MemoryRuntime } from './MemoryRuntime';
import { OwnershipManager } from './OwnershipManager';
import { WorldActionRegistry } from './WorldActionRegistry';
import { ALL_DAY_CALL_INTERACTION_ID, ALL_DAY_CALL_MEMORY, ALL_DAY_CALL_MEMORY_ID, ALL_DAY_CALL_WORLD_ACTION_ID } from './allDayCallMemoryDefinition';

type Stage = 0 | 1 | 2 | 3;
function registerStageAction(actions: WorldActionRegistry, setStage: (stage: Stage) => void, getStage: () => Stage) {
  return actions.register(ALL_DAY_CALL_WORLD_ACTION_ID, ({ payload }) => { const previous = getStage(); const stage = (payload as { stage?: Stage }).stage; if (stage !== 0 && stage !== 1 && stage !== 2 && stage !== 3) throw new Error('bad stage'); setStage(stage); return { undo: () => setStage(previous) }; });
}

describe('production Memory 1 — Through Every Emotion', () => {
  let ownership: OwnershipManager; let actions: WorldActionRegistry; let runtime: MemoryRuntime; let stage: Stage;
  beforeEach(() => { ownership = new OwnershipManager(); actions = new WorldActionRegistry(); stage = 0; registerStageAction(actions, (value) => { stage = value; }, () => stage); runtime = new MemoryRuntime(ownership, actions); runtime.registry.register(ALL_DAY_CALL_MEMORY); });
  const firstBeat = () => { expect(runtime.activate(ALL_DAY_CALL_MEMORY_ID)).toBe(true); runtime.tick(700); expect(runtime.getSnapshot().stepId).toBe('unspoken-feeling'); };
  const checkpointOne = () => { firstBeat(); runtime.acknowledge(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('chose-to-stay'); };
  const checkpointTwo = () => { checkpointOne(); runtime.acknowledge(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('quiet-choice'); };
  const checkpointThree = () => { checkpointTwo(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('hold-after-final-reflection'); };
  const finish = () => { checkpointThree(); runtime.tick(600); };

  it('registers with exact source linkage, no prerequisite, and replayable completion persistence', () => {
    expect(ALL_DAY_CALL_MEMORY.sourceMemoryId).toBe('memory.all-day-call'); expect(ALL_DAY_CALL_MEMORY.prerequisiteIds ?? []).toEqual([]); expect(ALL_DAY_CALL_MEMORY.behavior).toBe('replayable'); expect(ALL_DAY_CALL_MEMORY.persistence).toBe('completion'); expect(runtime.isEligible(ALL_DAY_CALL_MEMORY_ID)).toBe(true);
  });
  it('acquires all five owners and uses a smaller camera move than prior production memories', () => {
    firstBeat(); expect(Object.values(ownership.snapshot()).every((owner) => owner === ALL_DAY_CALL_MEMORY_ID)).toBe(true); const camera = ALL_DAY_CALL_MEMORY.steps.find((step) => step.type === 'camera'); expect(camera?.type === 'camera' ? camera.durationMs : Infinity).toBe(700);
  });
  it('uses only approved beats', () => {
    const copy = ALL_DAY_CALL_MEMORY.steps.filter((step) => step.type === 'dialogue').map((step) => step.text);
    expect(copy).toEqual(['Even on days when you feel sad or moody and things feel difficult…', '…the effort you make to listen, understand, and stay close to me is remarkable.', 'I must have done something truly wonderful in a past life…', '…to be blessed with someone as caring and devoted as you.', 'Your presence in my life is a gift I will cherish forever.']);
  });
  it('progresses one action through three absolute stages, reaffirms final restore state, and clears', () => {
    checkpointOne(); expect(stage).toBe(1); runtime.acknowledge(); expect(stage).toBe(2); runtime.acknowledge(); expect(stage).toBe(3); runtime.acknowledge(); expect(stage).toBe(3); runtime.tick(600); expect(stage).toBe(0); expect(new Set(actions.getCalls().map((call) => call.id))).toEqual(new Set([ALL_DAY_CALL_WORLD_ACTION_ID]));
  });
  it('restores Checkpoint 1 with Stage 1, Beat 3, camera, and ownership', () => {
    checkpointOne(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage); const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], runtime.getCheckpoint()); restored.registry.register(ALL_DAY_CALL_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(1); expect(restored.getSnapshot().stepId).toBe('chose-to-stay'); expect(Object.values(restored.getOwnership()).every((owner) => owner === ALL_DAY_CALL_MEMORY_ID)).toBe(true);
  });
  it('restores Checkpoint 2 directly to Stage 3 and the final reflection', () => {
    checkpointTwo(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage); const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], runtime.getCheckpoint()); restored.registry.register(ALL_DAY_CALL_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(3); expect(restored.getSnapshot().stepId).toBe('quiet-choice');
  });
  it('restores Checkpoint 3 to acknowledged final state and completes without replaying narration', () => {
    checkpointThree(); const checkpoint = runtime.getCheckpoint(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage); const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], checkpoint); restored.registry.register(ALL_DAY_CALL_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(3); expect(restored.getSnapshot().stepId).toBe('hold-after-final-reflection'); expect(restored.getSnapshot().dialogue).toBeNull(); restored.tick(600); expect(restoredStage).toBe(0); expect(restored.getCompletedIds()).toEqual([ALL_DAY_CALL_MEMORY_ID]);
  });
  it('cancels safely before and after every checkpoint and reverses all stages', () => {
    firstBeat(); runtime.cancel(); expect(stage).toBe(0); checkpointOne(); runtime.cancel(); expect(stage).toBe(0); checkpointTwo(); runtime.cancel(); expect(stage).toBe(0); checkpointThree(); runtime.cancel(); expect(stage).toBe(0); expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
  it('persists completion once and permits deliberate replay without duplication', () => {
    finish(); expect(runtime.getCompletedIds()).toEqual([ALL_DAY_CALL_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.all-day-call.quiet-presence']); expect(runtime.isEligible(ALL_DAY_CALL_MEMORY_ID)).toBe(true); finish(); expect(runtime.getCompletedIds()).toEqual([ALL_DAY_CALL_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.all-day-call.quiet-presence']);
  });
  it('provides the completed replay prompt and cooldown through the interaction runtime', () => {
    const interactions = new InteractionRuntime(); const activate = vi.fn(); const observer = { x: 0, y: 0, z: 0, forwardX: 0, forwardY: 0, forwardZ: 1 };
    interactions.registry.register({ id: ALL_DAY_CALL_INTERACTION_ID, type: 'proximity', position: [0, 0, 0], activationDistance: 2, behavior: 'repeatable', persistence: 'completion', cooldownMs: 900, prompt: 'Remember Through Every Emotion', completedPrompt: 'Replay “Through Every Emotion”', accessibilityLabel: 'Remember Through Every Emotion', onActivate: activate }); interactions.update(observer, 0); interactions.activate(1); expect(interactions.activate(2)).toBe(false); interactions.update(observer, 902); expect(interactions.getSnapshot().prompt).toBe('Replay “Through Every Emotion”'); interactions.activate(903); expect(activate).toHaveBeenCalledTimes(2); expect(interactions.getCompletedIds()).toEqual([ALL_DAY_CALL_INTERACTION_ID]);
  });
});
