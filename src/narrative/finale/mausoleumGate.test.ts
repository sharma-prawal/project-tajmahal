import { describe, expect, it } from 'vitest';
import { TAJ_MAIN_DOOR_APPROACH_Z } from '@constants/tajPlacement';
import { MEMORY_GATE_THRESHOLD } from '@narrative/memory/memoryProgress';
import { InteractionRuntime } from '@core/interaction/InteractionRuntime';
import { OwnershipManager } from '@core/memoryRuntime/OwnershipManager';
import {
  createMausoleumGateInteraction,
  isMausoleumGateBlocking,
  MAUSOLEUM_GATE_INTERACTION_ID,
  mausoleumGateDoorAngle,
  mausoleumGatePrompt,
  mausoleumGateState,
} from './gateState';

describe('mausoleum finale gate', () => {
  it('blocks entry and explains the requirement before eligibility', () => {
    const state = mausoleumGateState(MEMORY_GATE_THRESHOLD - 1, false);
    expect(state).toBe('not-ready');
    expect(isMausoleumGateBlocking(state)).toBe(true);
    expect(mausoleumGatePrompt(state)).toContain(`remember ${MEMORY_GATE_THRESHOLD} memories`);
  });

  it('keeps collision active at eligibility until the player opens the door', () => {
    const state = mausoleumGateState(MEMORY_GATE_THRESHOLD, false);
    expect(state).toBe('ready');
    expect(isMausoleumGateBlocking(state)).toBe(true);
    expect(mausoleumGatePrompt(state)).toBe('Open the mausoleum');
  });

  it('keeps collision after the doors open so the Taj remains non-traversable', () => {
    const state = mausoleumGateState(MEMORY_GATE_THRESHOLD, true);
    expect(state).toBe('entered');
    expect(isMausoleumGateBlocking(state)).toBe(true);
    expect(mausoleumGatePrompt(state)).toBe('The doorway is open');
  });

  it('honours a persisted open interaction even if legacy progress is unavailable', () => {
    expect(mausoleumGateState(0, true)).toBe('entered');
  });

  it('is idempotent for repeated interaction and reload restoration', () => {
    expect(mausoleumGateState(7, true)).toBe(mausoleumGateState(7, true));
  });

  it('does not persist or open a locked interaction', () => {
    const runtime = new InteractionRuntime();
    runtime.registry.register(createMausoleumGateInteraction('not-ready'));
    runtime.update({ x: 0, y: 5.6, z: TAJ_MAIN_DOOR_APPROACH_Z, forwardX: 0, forwardY: 0, forwardZ: -1 }, 0);
    expect(runtime.activate(1)).toBe(true);
    expect(runtime.getCompletedIds()).toEqual([]);
  });

  it('persists an eligible opening and restores an already-open door safely', () => {
    const runtime = new InteractionRuntime();
    runtime.registry.register(createMausoleumGateInteraction('ready'));
    const observer = { x: 0, y: 5.6, z: TAJ_MAIN_DOOR_APPROACH_Z, forwardX: 0, forwardY: 0, forwardZ: -1 };
    runtime.update(observer, 0);
    expect(runtime.activate(1)).toBe(true);
    expect(runtime.getCompletedIds()).toEqual([MAUSOLEUM_GATE_INTERACTION_ID]);

    const reloaded = new InteractionRuntime();
    reloaded.registry.register(createMausoleumGateInteraction('entered'));
    reloaded.restore(runtime.getCompletedIds(), []);
    reloaded.update(observer, 600);
    expect(reloaded.getSnapshot().prompt).toBe('The doorway is open');
    expect(reloaded.getCompletedIds()).toEqual([MAUSOLEUM_GATE_INTERACTION_ID]);
  });

  it('snaps the open angle deterministically for reduced motion', () => {
    expect(mausoleumGateDoorAngle('not-ready')).toBe(0);
    expect(mausoleumGateDoorAngle('ready')).toBe(0);
    expect(mausoleumGateDoorAngle('entered')).toBe(Math.PI / 2);
  });

  it('does not take camera or traversal ownership', () => {
    const ownership = new OwnershipManager();
    const runtime = new InteractionRuntime();
    runtime.registry.register(createMausoleumGateInteraction('ready'));
    runtime.update({ x: 0, y: 5.6, z: TAJ_MAIN_DOOR_APPROACH_Z, forwardX: 0, forwardY: 0, forwardZ: -1 }, 0);
    runtime.activate(1);
    expect(Object.values(ownership.snapshot()).every((owner) => owner === null)).toBe(true);
  });
});
