import { describe, expect, it } from 'vitest';
import { createLocomotionStartGate } from './locomotionStartGate';

describe('locomotion start presentation gate', () => {
  it('holds every physics step until one animation render completes', () => {
    const gate = createLocomotionStartGate();

    expect(gate.beforePhysics(true)).toBe(true);
    expect(gate.beforePhysics(true)).toBe(true);
    gate.afterRender();
    expect(gate.beforePhysics(true)).toBe(false);
  });

  it('requires a new animation render after movement stops and restarts', () => {
    const gate = createLocomotionStartGate();

    expect(gate.beforePhysics(true)).toBe(true);
    gate.afterRender();
    expect(gate.beforePhysics(true)).toBe(false);
    expect(gate.beforePhysics(false)).toBe(false);
    expect(gate.beforePhysics(true)).toBe(true);
  });
});