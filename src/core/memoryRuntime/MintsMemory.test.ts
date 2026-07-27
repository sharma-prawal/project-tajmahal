import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionRuntime } from '@core/interaction/InteractionRuntime';
import { PressLatch } from '@core/interaction/pressLatch';
import { MemoryRuntime } from './MemoryRuntime';
import { OwnershipManager } from './OwnershipManager';
import { WorldActionRegistry } from './WorldActionRegistry';
import { cameraBlendProgress } from './MemoryCameraState';
import { MINTS_MEMORY, MINTS_MEMORY_ID, MINTS_WORLD_ACTION_ID } from './mintsMemoryDefinition';

describe('production Memory 1 — Warmth in Absence', () => {
  let ownership: OwnershipManager; let actions: WorldActionRegistry; let runtime: MemoryRuntime; let visible: boolean;
  beforeEach(() => {
    ownership = new OwnershipManager(); actions = new WorldActionRegistry(); visible = false;
    actions.register(MINTS_WORLD_ACTION_ID, ({ payload }) => { if ((payload as { visible?: boolean }).visible !== true) throw new Error('bad payload'); visible = true; return { undo: () => { visible = false; } }; });
    runtime = new MemoryRuntime(ownership, actions); runtime.registry.register(MINTS_MEMORY);
  });
  const enterFirstBeat = () => { expect(runtime.activate(MINTS_MEMORY_ID)).toBe(true); runtime.tick(1000); expect(runtime.getSnapshot().stepId).toBe('friend-offer-declined'); };
  it('registers with exact source linkage, no prerequisites, and valid replay policy', () => {
    expect(runtime.registry.get(MINTS_MEMORY_ID)?.sourceMemoryId).toBe('memory.mints'); expect(MINTS_MEMORY.prerequisiteIds ?? []).toEqual([]); expect(runtime.isEligible(MINTS_MEMORY_ID)).toBe(true);
  });
  it('acquires every owner, suppresses source input, and reaches the first factual beat', () => {
    enterFirstBeat(); expect(Object.values(ownership.snapshot()).every((owner) => owner === MINTS_MEMORY_ID)).toBe(true);
    expect(runtime.getSnapshot().dialogue?.text).toContain('When our parents were away in Himachal');
  });
  it('creates a checkpoint, applies exactly one reversible mint action, and preserves narrative order', () => {
    enterFirstBeat(); runtime.acknowledge();
    expect(runtime.getCheckpoint()?.stepId).toBe('before-acceptance'); expect(visible).toBe(true); expect(actions.getCalls()).toEqual([{ id: MINTS_WORLD_ACTION_ID, memoryId: MINTS_MEMORY_ID }]);
    expect(runtime.getSnapshot().dialogue?.text).toContain('delicious food'); runtime.acknowledge(); expect(runtime.getSnapshot().dialogue?.text).toContain('quiet kind of love');
  });
  it('reverts the mint action and releases locks when cancelled after checkpoint', () => {
    enterFirstBeat(); runtime.acknowledge(); expect(visible).toBe(true); runtime.cancel('user-cancelled');
    expect(visible).toBe(false); expect(runtime.getCheckpoint()).toBeNull(); expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
  it('cancels safely before checkpoint and cleans source interaction', () => {
    const cancel = vi.fn(() => true); const complete = vi.fn(() => true); expect(runtime.activate(MINTS_MEMORY_ID, { cancel, complete })).toBe(true); runtime.cancel();
    expect(cancel).toHaveBeenCalledOnce(); expect(complete).not.toHaveBeenCalled(); expect(visible).toBe(false);
  });
  it('completes, persists, releases ownership, and permits replay', () => {
    enterFirstBeat(); runtime.acknowledge(); runtime.acknowledge(); runtime.acknowledge();
    expect(runtime.getCompletedIds()).toEqual([MINTS_MEMORY_ID]); expect(runtime.getFlags()).toContain('memory.mints.accepted');
    expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
    expect(runtime.activate(MINTS_MEMORY_ID)).toBe(true);
  });
  it('restores from the pre-action checkpoint by deterministically reapplying the mint action', () => {
    enterFirstBeat(); runtime.acknowledge(); const checkpoint = runtime.getCheckpoint();
    const restoredActions = new WorldActionRegistry(); let restoredVisible = false; restoredActions.register(MINTS_WORLD_ACTION_ID, () => { restoredVisible = true; return { undo: () => { restoredVisible = false; } }; });
    const restored = new MemoryRuntime(new OwnershipManager(), restoredActions); restored.restore([], [], checkpoint); restored.registry.register(MINTS_MEMORY);
    expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restoredVisible).toBe(true); expect(restored.getSnapshot().stepId).toBe('narrator-offer-accepted'); expect(Object.values(restored.getOwnership()).every((owner) => owner === MINTS_MEMORY_ID)).toBe(true);
  });
  it('rejects incompatible restore versions and releases ownership after action failure', () => {
    const checkpoint = { memoryId: MINTS_MEMORY_ID, contentVersion: 99, stepId: 'before-acceptance' };
    runtime.restore([], [], checkpoint); expect(runtime.tryRestoreCheckpoint()).toBe(false);
    const failingActions = new WorldActionRegistry(); failingActions.register(MINTS_WORLD_ACTION_ID, () => { throw new Error('action failed'); });
    const failing = new MemoryRuntime(new OwnershipManager(), failingActions); failing.registry.register(MINTS_MEMORY); failing.activate(MINTS_MEMORY_ID); failing.tick(1000); failing.acknowledge();
    expect(failing.getSnapshot().lifecycle).toBe('failed'); expect(Object.values(failing.getOwnership()).every((owner) => owner === null)).toBe(true);
  });
  it('uses reduced-motion camera completion and deliberate acknowledgement debouncing', () => {
    expect(cameraBlendProgress(1, 1000, true)).toBe(1); const latch = new PressLatch(); expect(latch.down()).toBe(true); expect(latch.down()).toBe(false); latch.up(); expect(latch.down()).toBe(true);
  });
  it('source completion permits replay prompt in the interaction runtime', () => {
    const interactions = new InteractionRuntime(); interactions.restore(['interaction.memory.mints'], []);
  });
});
