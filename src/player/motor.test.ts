import { describe, expect, it } from 'vitest';
import { computeMotorTarget } from './motor';
import { MOVEMENT } from '@constants/movement';

describe('computeMotorTarget', () => {
  it('reports no input and zero rate change for a centered stick', () => {
    const result = computeMotorTarget({
      moveRight: 0,
      moveForward: 0,
      cameraYaw: 0,
      grounded: true,
    });
    expect(result.hasInput).toBe(false);
    expect(result.targetVelocityX).toBe(0);
    expect(result.targetVelocityZ).toBe(0);
    expect(result.facing).toBeNull();
  });

  it('moves along -Z at camera yaw 0 when pushing forward', () => {
    const result = computeMotorTarget({
      moveRight: 0,
      moveForward: 1,
      cameraYaw: 0,
      grounded: true,
    });
    expect(result.hasInput).toBe(true);
    expect(result.targetVelocityZ).toBeCloseTo(-MOVEMENT.walkSpeed, 5);
    expect(result.targetVelocityX).toBeCloseTo(0, 5);
  });

  it('rotates movement by camera yaw so forward is camera-relative', () => {
    // Camera yawed 90 degrees: "forward" in camera space now points along +X.
    const result = computeMotorTarget({
      moveRight: 0,
      moveForward: 1,
      cameraYaw: Math.PI / 2,
      grounded: true,
    });
    expect(result.targetVelocityX).toBeCloseTo(-MOVEMENT.walkSpeed, 5);
    expect(result.targetVelocityZ).toBeCloseTo(0, 5);
  });

  it('accepts an explicit walk-speed tuning override', () => {
    const result = computeMotorTarget({
      moveRight: 0,
      moveForward: 1,
      cameraYaw: 0,
      grounded: true,
    }, { walkSpeed: 1.75, acceleration: 8, deceleration: 10, airControl: 0.3 });
    expect(Math.hypot(result.targetVelocityX, result.targetVelocityZ)).toBeCloseTo(
      1.75,
      5,
    );
  });

  it('reduces acceleration rate under airControl when not grounded', () => {
    const grounded = computeMotorTarget({
      moveRight: 0,
      moveForward: 1,
      cameraYaw: 0,
      grounded: true,
    });
    const airborne = computeMotorTarget({
      moveRight: 0,
      moveForward: 1,
      cameraYaw: 0,
      grounded: false,
    });
    expect(airborne.rate).toBeCloseTo(grounded.rate * MOVEMENT.airControl, 5);
  });

  it('normalizes diagonal input so it is not faster than a single axis', () => {
    const diagonal = computeMotorTarget({
      moveRight: 1,
      moveForward: 1,
      cameraYaw: 0,
      grounded: true,
    });
    const speed = Math.hypot(diagonal.targetVelocityX, diagonal.targetVelocityZ);
    expect(speed).toBeCloseTo(MOVEMENT.walkSpeed, 5);
  });
});
