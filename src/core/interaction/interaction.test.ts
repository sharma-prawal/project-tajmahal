import { describe, expect, it, vi } from 'vitest';
import { InteractionRegistry } from './InteractionRegistry';
import { InteractionRuntime } from './InteractionRuntime';
import { PressLatch } from './pressLatch';
import { selectInteraction } from './selection';
import { nextInteractionState } from './stateMachine';
import type { InteractionDefinition, InteractionObserver } from './types';

const observer: InteractionObserver = { x: 0, y: 0, z: 0, forwardX: 0, forwardY: 0, forwardZ: 1 };
const definition = (id: string, overrides: Partial<InteractionDefinition> = {}): InteractionDefinition => ({
  id, type: 'proximity', position: [0, 0, 3], activationDistance: 5, priority: 0,
  behavior: 'repeatable', prompt: `Use ${id}`, accessibilityLabel: `Use ${id}`, ...overrides,
});

describe('InteractionRegistry', () => {
  it('registers and identity-safely unregisters definitions', () => {
    const registry = new InteractionRegistry();
    const unregister = registry.register(definition('marker.one'));
    expect(registry.size).toBe(1);
    unregister(); unregister();
    expect(registry.size).toBe(0);
  });
  it('rejects duplicate stable ids', () => {
    const registry = new InteractionRegistry();
    registry.register(definition('marker.one'));
    expect(() => registry.register(definition('marker.one'))).toThrow(/Duplicate/);
  });
  it('validates bounds and configuration', () => {
    const registry = new InteractionRegistry();
    expect(() => registry.register(definition('bad id'))).toThrow(/Invalid interaction id/);
    expect(() => registry.register(definition('marker.zero', { activationDistance: 0 }))).toThrow(/activation distance/);
    expect(() => registry.register(definition('marker.view', { type: 'view-and-proximity' }))).toThrow(/focus angle/);
  });
});

describe('selection', () => {
  it('checks range and optional focus angle', () => {
    const defs = [definition('marker.near'), definition('marker.far', { position: [0, 0, 8] }), definition('marker.behind', { type: 'view-and-proximity', position: [0, 0, -2], focusAngleDegrees: 30 })];
    const result = selectInteraction(defs, observer, new Set(), null);
    expect(result.selected?.id).toBe('marker.near');
    expect(result.diagnostics.find((x) => x.id === 'marker.far')?.rangeEligible).toBe(false);
    expect(result.diagnostics.find((x) => x.id === 'marker.behind')?.angleEligible).toBe(false);
  });
  it('orders by priority, alignment, distance, then stable id', () => {
    const high = definition('marker.high', { priority: 4, position: [0, 0, 4] });
    const low = definition('marker.low', { priority: 1, position: [0, 0, 2] });
    expect(selectInteraction([low, high], observer, new Set(), null).selected?.id).toBe('marker.high');
    const tied = [definition('marker.beta'), definition('marker.alpha')];
    expect(selectInteraction(tied, observer, new Set(), null).selected?.id).toBe('marker.alpha');
  });
  it('retains focus within hysteresis unless a peer is materially closer', () => {
    const current = definition('marker.current', { position: [0, 0, 3.4] });
    const challenger = definition('marker.challenger', { position: [0, 0, 3] });
    expect(selectInteraction([current, challenger], observer, new Set(), 'marker.current').selected?.id).toBe('marker.current');
    const material = definition('marker.challenger', { position: [0, 0, 2.6] });
    expect(selectInteraction([current, material], observer, new Set(), 'marker.current').selected?.id).toBe('marker.challenger');
  });
  it('excludes disabled and completed one-shot interactions', () => {
    const defs = [definition('marker.disabled', { enabled: false }), definition('marker.done', { behavior: 'one-shot', priority: 9 })];
    expect(selectInteraction(defs, observer, new Set(['marker.done']), null).selected).toBeNull();
  });
});

describe('input and lifecycle', () => {
  it('debounces deliberate presses until release', () => {
    const latch = new PressLatch();
    expect(latch.down()).toBe(true); expect(latch.down()).toBe(false); expect(latch.down(true)).toBe(false);
    latch.up(); expect(latch.down()).toBe(true);
  });
  it('handles focus, interruption, cancellation and completion explicitly', () => {
    expect(nextInteractionState('idle', 'focus')).toBe('focused');
    expect(nextInteractionState('focused', 'activate')).toBe('activating');
    expect(nextInteractionState('active', 'blur', 'cancel-on-exit')).toBe('cancelled');
    expect(nextInteractionState('active', 'blur', 'ignore')).toBe('active');
    expect(nextInteractionState('active', 'blur', 'complete-on-exit')).toBe('completing');
    expect(nextInteractionState('completing', 'complete')).toBe('completed');
  });
});

describe('InteractionRuntime', () => {
  it('completes and restores a persisted one-shot without replaying it', () => {
    const runtime = new InteractionRuntime();
    const callback = vi.fn();
    runtime.registry.register(definition('marker.once', { behavior: 'one-shot', persistence: 'completion', onActivate: callback }));
    runtime.update(observer, 0); expect(runtime.activate(1)).toBe(true);
    expect(callback).toHaveBeenCalledOnce(); expect(runtime.getCompletedIds()).toEqual(['marker.once']);
    const restored = new InteractionRuntime(); restored.registry.register(definition('marker.once', { behavior: 'one-shot', persistence: 'completion', onActivate: callback }));
    restored.restore(['marker.once'], []); restored.update(observer, 2);
    expect(restored.getSnapshot().focusedId).toBeNull(); expect(callback).toHaveBeenCalledOnce();
  });
  it('allows a repeatable interaction again after cooldown', () => {
    const runtime = new InteractionRuntime(); const callback = vi.fn();
    runtime.registry.register(definition('marker.repeat', { cooldownMs: 50, onActivate: callback }));
    runtime.update(observer, 0); runtime.activate(1); runtime.update(observer, 60); runtime.activate(61);
    expect(callback).toHaveBeenCalledTimes(2); expect(runtime.getCompletedIds()).toEqual([]);
  });
  it('persists repeatable completion and exposes a deliberate completed prompt after cooldown', () => {
    const runtime = new InteractionRuntime(); const callback = vi.fn();
    runtime.registry.register(definition('marker.ritual', { persistence: 'completion', cooldownMs: 50, completedPrompt: 'Replay ritual', completedAccessibilityLabel: 'Replay the ritual', onActivate: callback }));
    runtime.update(observer, 0); runtime.activate(1); expect(runtime.getCompletedIds()).toEqual(['marker.ritual']);
    runtime.update(observer, 60); expect(runtime.getSnapshot().prompt).toBe('Replay ritual'); expect(runtime.getSnapshot().accessibilityLabel).toBe('Replay the ritual');
    runtime.activate(61); expect(callback).toHaveBeenCalledTimes(2); expect(runtime.getCompletedIds()).toEqual(['marker.ritual']);
  });
  it('reconciles a restored memory completion without requiring a live activation lifecycle', () => {
    const runtime = new InteractionRuntime();
    runtime.registry.register(definition('marker.restored', { persistence: 'completion', completedPrompt: 'Replay restored' }));
    expect(runtime.completeRestored('marker.restored')).toBe(true); expect(runtime.getCompletedIds()).toEqual(['marker.restored']);
    runtime.update(observer, 1); expect(runtime.getSnapshot().prompt).toBe('Replay restored');
    expect(runtime.completeRestored('missing.restored')).toBe(false);
  });
  it('does not activate disabled definitions', () => {
    const runtime = new InteractionRuntime(); runtime.registry.register(definition('marker.disabled', { enabled: false }));
    runtime.update(observer, 0); expect(runtime.activate(1)).toBe(false);
  });
  it('keeps manual interactions active and applies exit interruption policy', () => {
    const runtime = new InteractionRuntime();
    runtime.registry.register(definition('marker.manual', { completion: 'manual', interruption: 'cancel-on-exit' }));
    runtime.update(observer, 0); runtime.activate(1);
    expect(runtime.getSnapshot().lifecycle).toBe('active');
    runtime.update({ ...observer, z: 30 }, 2);
    expect(runtime.getSnapshot().lifecycle).toBe('cancelled');
  });
  it('exposes explicit completion for future narrative sequences', () => {
    const runtime = new InteractionRuntime();
    runtime.registry.register(definition('marker.sequence', { completion: 'manual', behavior: 'one-shot', persistence: 'completion' }));
    runtime.update(observer, 0); runtime.activate(1);
    expect(runtime.complete(2)).toBe(true);
    expect(runtime.getCompletedIds()).toEqual(['marker.sequence']);
  });
  it('prevents a non-persisted one-shot from replaying during the session', () => {
    const runtime = new InteractionRuntime();
    runtime.registry.register(definition('marker.session-once', { behavior: 'one-shot' }));
    runtime.update(observer, 0); runtime.activate(1); runtime.update(observer, 2);
    expect(runtime.getSnapshot().focusedId).toBeNull();
    expect(runtime.getCompletedIds()).toEqual([]);
  });
});
