import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRuntime } from './MemoryRuntime';
import { OwnershipManager } from './OwnershipManager';
import { WorldActionRegistry } from './WorldActionRegistry';
import { cameraBlendProgress } from './MemoryCameraState';
import { PressLatch } from '@core/interaction/pressLatch';
import type { RuntimeMemoryDefinition } from './types';

const base = (overrides: Partial<RuntimeMemoryDefinition> = {}): RuntimeMemoryDefinition => ({
  id: 'dev.memory', label: 'test', triggerInteractionId: 'dev.trigger', contentVersion: 1,
  behavior: 'one-shot', persistence: 'completion', restorePolicy: 'resume-checkpoint', cancellationPolicy: 'allow', accessibilityLabel: 'Test memory',
  steps: [{ id: 'done', type: 'complete' }], ...overrides,
});

describe('memory registry and eligibility', () => {
  it('registers/unregisters and rejects duplicates', () => {
    const runtime = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry()); const definition = base();
    const unregister = runtime.registry.register(definition); expect(runtime.registry.list()).toHaveLength(1);
    expect(() => runtime.registry.register(definition)).toThrow(/Duplicate memory/); unregister(); expect(runtime.registry.list()).toHaveLength(0);
  });
  it('rejects invalid prerequisite references and missing actions', () => {
    const actions = new WorldActionRegistry(); const runtime = new MemoryRuntime(new OwnershipManager(), actions);
    expect(() => runtime.registry.register(base({ prerequisiteIds: ['dev.missing'] }))).toThrow(/missing prerequisite/);
    expect(() => runtime.registry.register(base({ steps: [{ id: 'action', type: 'world-action', actionId: 'dev.missing' }, { id: 'done', type: 'complete' }] }))).toThrow(/Missing world action/);
  });
  it('requires prerequisite completion', () => {
    const runtime = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry());
    runtime.registry.register(base({ id: 'dev.first' })); runtime.registry.register(base({ id: 'dev.second', prerequisiteIds: ['dev.first'] }));
    expect(runtime.isEligible('dev.second')).toBe(false); runtime.activate('dev.first'); expect(runtime.isEligible('dev.second')).toBe(true);
  });
});

describe('memory sequencing', () => {
  let ownership: OwnershipManager; let actions: WorldActionRegistry; let runtime: MemoryRuntime;
  beforeEach(() => { ownership = new OwnershipManager(); actions = new WorldActionRegistry(); runtime = new MemoryRuntime(ownership, actions); });
  it('activates once, rejects concurrent activation, advances acknowledgement, and completes', () => {
    runtime.registry.register(base({ steps: [{ id: 'locks', type: 'acquire', resources: ['traversal', 'modal-ui'] }, { id: 'line', type: 'dialogue', speaker: 'Test', text: 'Placeholder' }, { id: 'done', type: 'complete' }] }));
    expect(runtime.activate('dev.memory')).toBe(true); expect(runtime.activate('dev.memory')).toBe(false);
    expect(runtime.getSnapshot().lifecycle).toBe('awaiting-input'); expect(ownership.ownerOf('traversal')).toBe('dev.memory');
    expect(runtime.acknowledge()).toBe(true); expect(runtime.getSnapshot().lifecycle).toBe('completed'); expect(ownership.ownerOf('traversal')).toBeNull();
    expect(runtime.activate('dev.memory')).toBe(false);
  });
  it('debounces acknowledgement and completes a timed step deterministically', () => {
    runtime.registry.register(base({ behavior: 'replayable', persistence: 'none', steps: [{ id: 'line', type: 'dialogue', speaker: 'Test', text: 'One' }, { id: 'wait', type: 'wait', durationMs: 100 }, { id: 'done', type: 'complete' }] }));
    runtime.activate('dev.memory'); const latch = new PressLatch(); expect(latch.down()).toBe(true); runtime.acknowledge(); expect(latch.down()).toBe(false);
    runtime.tick(99); expect(runtime.getSnapshot().stepId).toBe('wait'); runtime.tick(1); expect(runtime.getSnapshot().lifecycle).toBe('completed');
  });
  it('supports replayable definitions', () => {
    runtime.registry.register(base({ behavior: 'replayable', persistence: 'none' })); expect(runtime.activate('dev.memory')).toBe(true); expect(runtime.activate('dev.memory')).toBe(true);
  });
  it('persists replayable completion once without removing replay eligibility', () => {
    runtime.registry.register(base({ behavior: 'replayable', persistence: 'completion' }));
    expect(runtime.activate('dev.memory')).toBe(true); expect(runtime.getCompletedIds()).toEqual(['dev.memory']); expect(runtime.isEligible('dev.memory')).toBe(true);
    expect(runtime.activate('dev.memory')).toBe(true); expect(runtime.getCompletedIds()).toEqual(['dev.memory']);
  });
  it('owns traversal/camera and releases every lock on cancellation', () => {
    runtime.registry.register(base({ steps: [{ id: 'locks', type: 'acquire', resources: ['traversal', 'camera', 'interaction', 'narrative-input', 'modal-ui'] }, { id: 'line', type: 'dialogue', speaker: 'Test', text: 'Wait' }, { id: 'done', type: 'complete' }] }));
    runtime.activate('dev.memory'); expect(ownership.ownerOf('camera')).toBe('dev.memory'); expect(runtime.cancel()).toBe(true);
    expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
  it('rejects ownership conflicts and cleans acquired locks after failure', () => {
    ownership.acquire('camera', 'other'); runtime.registry.register(base({ steps: [{ id: 'locks', type: 'acquire', resources: ['traversal', 'camera'] }, { id: 'done', type: 'complete' }] }));
    runtime.activate('dev.memory'); expect(runtime.getSnapshot().lifecycle).toBe('failed'); expect(ownership.ownerOf('traversal')).toBeNull(); expect(ownership.ownerOf('camera')).toBe('other');
  });
  it('reverts cancellable world actions and reports missing runtime actions safely', () => {
    let visible = false; actions.register('dev.reveal', () => { visible = true; return { undo: () => { visible = false; } }; });
    runtime.registry.register(base({ steps: [{ id: 'action', type: 'world-action', actionId: 'dev.reveal' }, { id: 'line', type: 'dialogue', speaker: 'Test', text: 'Wait' }, { id: 'done', type: 'complete' }] }));
    runtime.activate('dev.memory'); expect(visible).toBe(true); runtime.cancel(); expect(visible).toBe(false);
  });
  it('notifies source interaction on completion and cancellation', () => {
    const complete = vi.fn(() => true); const cancel = vi.fn(() => true); runtime.registry.register(base()); runtime.activate('dev.memory', { complete, cancel }); expect(complete).toHaveBeenCalledOnce();
    runtime.registry.register(base({ id: 'dev.cancel', steps: [{ id: 'line', type: 'dialogue', speaker: 'T', text: 'x' }, { id: 'done', type: 'complete' }] })); runtime.activate('dev.cancel', { complete, cancel }); runtime.cancel(); expect(cancel).toHaveBeenCalledOnce();
  });
  it('suspends browser-hidden time without advancing', () => {
    runtime.registry.register(base({ steps: [{ id: 'wait', type: 'wait', durationMs: 50 }, { id: 'done', type: 'complete' }] })); runtime.activate('dev.memory'); runtime.suspend(); runtime.tick(100);
    expect(runtime.getSnapshot().lifecycle).toBe('suspended'); runtime.resume(); runtime.tick(50); expect(runtime.getSnapshot().lifecycle).toBe('completed');
  });
});

describe('persistence and camera policy', () => {
  it('notifies completion subscribers when saved progress is restored', () => {
    const runtime = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry());
    const listener = vi.fn();
    runtime.subscribePersistence(listener);
    runtime.restore(['dev.first', 'dev.second'], [], null);
    expect(runtime.getCompletedCount()).toBe(2);
    expect(listener).toHaveBeenCalledOnce();
  });
  it('restores after an explicit checkpoint and rejects incompatible content versions', () => {
    const definition = base({ steps: [{ id: 'checkpoint', type: 'checkpoint' }, { id: 'line', type: 'dialogue', speaker: 'T', text: 'restored' }, { id: 'done', type: 'complete' }] });
    const first = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry()); first.registry.register(definition); first.activate('dev.memory');
    const persisted = first.getCheckpoint(); expect(persisted?.stepId).toBe('checkpoint');
    const restored = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry()); restored.restore([], [], persisted); restored.registry.register(definition); expect(restored.tryRestoreCheckpoint()).toBe(true); expect(restored.getSnapshot().stepId).toBe('line');
    const incompatible = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry()); incompatible.restore([], [], persisted); incompatible.registry.register({ ...definition, contentVersion: 2 }); expect(incompatible.tryRestoreCheckpoint()).toBe(false);
  });
  it('notifies a supplied interaction context when restored execution completes', () => {
    const definition = base({ steps: [{ id: 'checkpoint', type: 'checkpoint' }, { id: 'line', type: 'dialogue', speaker: 'T', text: 'restored' }, { id: 'done', type: 'complete' }] });
    const first = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry()); first.registry.register(definition); first.activate('dev.memory'); const persisted = first.getCheckpoint();
    const complete = vi.fn(() => true); const restored = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry()); restored.restore([], [], persisted); restored.registry.register(definition);
    expect(restored.tryRestoreCheckpoint({ complete, cancel: vi.fn(() => true) })).toBe(true); restored.acknowledge(); expect(complete).toHaveBeenCalledOnce();
  });
  it('clears an active checkpoint when the memory is cancelled', () => {
    const runtime = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry());
    runtime.registry.register(base({ steps: [{ id: 'checkpoint', type: 'checkpoint' }, { id: 'line', type: 'dialogue', speaker: 'T', text: 'x' }, { id: 'done', type: 'complete' }] }));
    runtime.activate('dev.memory'); expect(runtime.getCheckpoint()).not.toBeNull(); runtime.cancel(); expect(runtime.getCheckpoint()).toBeNull();
  });
  it('snaps reduced-motion camera blends and eases standard blends', () => {
    expect(cameraBlendProgress(1, 1000, true)).toBe(1); expect(cameraBlendProgress(250, 1000, false)).toBeCloseTo(.103515625); expect(cameraBlendProgress(500, 1000, false)).toBeCloseTo(.5); expect(cameraBlendProgress(1000, 1000, false)).toBe(1);
  });
});
