import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionRuntime } from '@core/interaction/InteractionRuntime';
import { MemoryRuntime } from './MemoryRuntime';
import { OwnershipManager } from './OwnershipManager';
import { WorldActionRegistry } from './WorldActionRegistry';
import { cameraBlendProgress } from './MemoryCameraState';
import { BOARDING_PASSES_INTERACTION_ID, BOARDING_PASSES_MEMORY, BOARDING_PASSES_MEMORY_ID, BOARDING_PASSES_WORLD_ACTION_ID } from './boardingPassesMemoryDefinition';

type Stage = 0 | 1 | 2 | 3;
function registerStageAction(actions: WorldActionRegistry, setStage: (stage: Stage) => void, getStage: () => Stage) {
  return actions.register(BOARDING_PASSES_WORLD_ACTION_ID, ({ payload }) => { const previous = getStage(); const stage = (payload as { stage?: Stage }).stage; if (stage !== 0 && stage !== 1 && stage !== 2 && stage !== 3) throw new Error('bad stage'); setStage(stage); return { undo: () => setStage(previous) }; });
}

describe('production Memory 3 — The Birthday Gift', () => {
  let ownership: OwnershipManager; let actions: WorldActionRegistry; let runtime: MemoryRuntime; let stage: Stage;
  beforeEach(() => { ownership = new OwnershipManager(); actions = new WorldActionRegistry(); stage = 0; registerStageAction(actions, (value) => { stage = value; }, () => stage); runtime = new MemoryRuntime(ownership, actions); runtime.registry.register(BOARDING_PASSES_MEMORY); });
  const firstBeat = () => { expect(runtime.activate(BOARDING_PASSES_MEMORY_ID)).toBe(true); runtime.tick(700); expect(runtime.getSnapshot().stepId).toBe('volunteered-help'); };
  const checkpointOne = () => { firstBeat(); runtime.acknowledge(); runtime.acknowledge(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('struggled-alone'); };
  const checkpointTwo = () => { checkpointOne(); runtime.acknowledge(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('chose-the-time'); };
  const checkpointThree = () => { checkpointTwo(); runtime.acknowledge(); expect(runtime.getSnapshot().stepId).toBe('hold-completed-arrangement'); };

  it('registers exact source linkage, no prerequisite, replay, and completion persistence', () => {
    expect(BOARDING_PASSES_MEMORY.sourceMemoryId).toBe('memory.boarding-passes'); expect(BOARDING_PASSES_MEMORY.prerequisiteIds ?? []).toEqual([]); expect(BOARDING_PASSES_MEMORY.behavior).toBe('replayable'); expect(BOARDING_PASSES_MEMORY.persistence).toBe('completion'); expect(runtime.isEligible(BOARDING_PASSES_MEMORY_ID)).toBe(true);
  });
  it('uses approved beats', () => {
    const copy = BOARDING_PASSES_MEMORY.steps.filter((step) => step.type === 'dialogue').map((step) => step.text);
    expect(copy).toEqual([
      'You always pay attention to the things I love and the hobbies that bring me joy...',
      '...like surprising me with the PS Portal for my birthday in 2026.',
      'It is never just about the gift itself...',
      '...but how deeply you know me and care about what makes me smile.',
      'That thoughtful care is something I love about you...',
      '...and it will always hold a special place in my heart.',
    ]);
  });
  it('acquires all owners and keeps the camera settle restrained', () => {
    firstBeat(); expect(Object.values(ownership.snapshot()).every((owner) => owner === BOARDING_PASSES_MEMORY_ID)).toBe(true); const camera = BOARDING_PASSES_MEMORY.steps.find((step) => step.type === 'camera'); expect(camera?.type === 'camera' ? camera.durationMs : Infinity).toBe(700);
  });
  it('progresses one reversible action through three absolute stages and clears', () => {
    firstBeat(); runtime.acknowledge(); runtime.acknowledge(); expect(stage).toBe(1); runtime.acknowledge(); expect(stage).toBe(2); runtime.acknowledge(); runtime.acknowledge(); expect(stage).toBe(3); runtime.acknowledge(); expect(stage).toBe(3); runtime.tick(600); expect(stage).toBe(0); expect(new Set(actions.getCalls().map((call) => call.id))).toEqual(new Set([BOARDING_PASSES_WORLD_ACTION_ID]));
  });
  it('restores effort checkpoint to Stage 2, Beat 4, camera, and ownership', () => {
    checkpointOne(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage); const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], runtime.getCheckpoint()); restored.registry.register(BOARDING_PASSES_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(2); expect(restored.getSnapshot().stepId).toBe('struggled-alone'); expect(Object.values(restored.getOwnership()).every((owner) => owner === BOARDING_PASSES_MEMORY_ID)).toBe(true);
  });
  it('restores collaboration checkpoint directly to Stage 3 and Beat 6', () => {
    checkpointTwo(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage); const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], runtime.getCheckpoint()); restored.registry.register(BOARDING_PASSES_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(3); expect(restored.getSnapshot().stepId).toBe('chose-the-time');
  });
  it('restores completion checkpoint without replaying narration, then completes', () => {
    checkpointThree(); const restoredActions = new WorldActionRegistry(); let restoredStage: Stage = 0; registerStageAction(restoredActions, (value) => { restoredStage = value; }, () => restoredStage); const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], runtime.getCheckpoint()); restored.registry.register(BOARDING_PASSES_MEMORY); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredStage).toBe(3); expect(restored.getSnapshot().dialogue).toBeNull(); restored.tick(600); expect(restoredStage).toBe(0); expect(restored.getCompletedIds()).toEqual([BOARDING_PASSES_MEMORY_ID]);
  });
  it('cancels safely around every checkpoint and reverses visible state', () => {
    firstBeat(); runtime.cancel(); expect(stage).toBe(0); checkpointOne(); runtime.cancel(); expect(stage).toBe(0); checkpointTwo(); runtime.cancel(); expect(stage).toBe(0); checkpointThree(); runtime.cancel(); expect(stage).toBe(0); expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
  it('persists once, supports deliberate replay, and exposes the replay prompt', () => {
    checkpointThree(); runtime.tick(600); expect(runtime.getCompletedIds()).toEqual([BOARDING_PASSES_MEMORY_ID]); expect(runtime.getFlags()).toEqual(['memory.boarding-passes.shared-effort']); expect(runtime.isEligible(BOARDING_PASSES_MEMORY_ID)).toBe(true); const interactions = new InteractionRuntime(); const activate = vi.fn(); interactions.registry.register({ id: BOARDING_PASSES_INTERACTION_ID, type: 'proximity', position: [0, 0, 0], activationDistance: 2, behavior: 'repeatable', persistence: 'completion', cooldownMs: 900, prompt: 'Remember The Birthday Gift', completedPrompt: 'Replay “The Birthday Gift”', accessibilityLabel: 'Remember The Birthday Gift', onActivate: activate }); const observer = { x: 0, y: 0, z: 0, forwardX: 0, forwardY: 0, forwardZ: 1 }; interactions.update(observer, 0); interactions.activate(1); interactions.update(observer, 902); expect(interactions.getSnapshot().prompt).toBe('Replay “The Birthday Gift”');
  });
  it('fails cleanly and preserves reduced-motion determinism', () => {
    const brokenActions = new WorldActionRegistry(); brokenActions.register(BOARDING_PASSES_WORLD_ACTION_ID, () => { throw new Error('arrangement failed'); }); const broken = new MemoryRuntime(new OwnershipManager(), brokenActions); broken.registry.register(BOARDING_PASSES_MEMORY); broken.activate(BOARDING_PASSES_MEMORY_ID); broken.tick(700); broken.acknowledge(); broken.acknowledge(); expect(broken.getSnapshot().lifecycle).toBe('failed'); expect(Object.values(broken.getOwnership()).every((owner) => owner === null)).toBe(true); expect(cameraBlendProgress(1, 700, true)).toBe(1);
  });
});
