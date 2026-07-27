import { describe, expect, it } from 'vitest';
import {
  TAJ_AUTHORED_BASE_TOP_Y,
  TAJ_AUTHORED_STAIR_APPROACH_X,
  TAJ_AUTHORED_STAIR_CENTER_Z,
  TAJ_AUTHORED_STAIR_DEPTH,
  TAJ_AUTHORED_STAIR_INNER_X,
} from '@constants/tajPlacement';
import {
  TAJ_LOCKED_STAIR_BLOCKER_SPECS,
  TAJ_UNLOCKED_STAIR_RAMP_SPECS,
} from './TajApproachStairs';

describe('authored Taj stair collision', () => {
  it('fills both visible stair channels while progression is locked', () => {
    expect(TAJ_LOCKED_STAIR_BLOCKER_SPECS).toHaveLength(2);
    for (const spec of TAJ_LOCKED_STAIR_BLOCKER_SPECS) {
      const centerX = Math.abs(spec.position[0]);
      expect(centerX - spec.args[0]).toBeLessThan(TAJ_AUTHORED_STAIR_INNER_X);
      expect(centerX + spec.args[0]).toBeGreaterThan(TAJ_AUTHORED_STAIR_APPROACH_X);
      expect(spec.position[1] + spec.args[1]).toBeCloseTo(TAJ_AUTHORED_BASE_TOP_Y, 6);
      expect(spec.position[2]).toBe(TAJ_AUTHORED_STAIR_CENTER_Z);
      expect(spec.args[2] * 2).toBe(TAJ_AUTHORED_STAIR_DEPTH);
    }
  });

  it('defines one inward-climbing ramp for each unlocked side', () => {
    expect(TAJ_UNLOCKED_STAIR_RAMP_SPECS).toHaveLength(2);
    const [left, right] = TAJ_UNLOCKED_STAIR_RAMP_SPECS;
    expect(left.position[0]).toBe(-right.position[0]);
    expect(left.rotation[2]).toBe(-right.rotation[2]);
    expect(left.rotation[2]).toBeGreaterThan(0);
    expect(right.rotation[2]).toBeLessThan(0);
    for (const spec of TAJ_UNLOCKED_STAIR_RAMP_SPECS) {
      expect(spec.position[2]).toBe(TAJ_AUTHORED_STAIR_CENTER_Z);
      expect(spec.args[2] * 2).toBe(TAJ_AUTHORED_STAIR_DEPTH);
    }
  });

  it('runs each ramp top face from the ground foot to the base-top landing', () => {
    for (const spec of TAJ_UNLOCKED_STAIR_RAMP_SPECS) {
      const [halfLength, halfThickness] = spec.args;
      const rotation = spec.rotation[2];
      // Local +Y (thickness axis) and +X (length axis) rotated into world space.
      const upX = -Math.sin(rotation);
      const upY = Math.cos(rotation);
      const lenX = Math.cos(rotation);
      const lenY = Math.sin(rotation);
      const topCenterX = spec.position[0] + halfThickness * upX;
      const topCenterY = spec.position[1] + halfThickness * upY;
      const cornerAX = topCenterX + halfLength * lenX;
      const cornerAY = topCenterY + halfLength * lenY;
      const cornerBX = topCenterX - halfLength * lenX;
      const cornerBY = topCenterY - halfLength * lenY;
      // One end sits at the outer foot on the ground, the other at the inner landing.
      const foot = cornerAY < cornerBY ? { x: cornerAX, y: cornerAY } : { x: cornerBX, y: cornerBY };
      const landing = cornerAY < cornerBY ? { x: cornerBX, y: cornerBY } : { x: cornerAX, y: cornerAY };
      expect(foot.y).toBeCloseTo(0, 5);
      expect(Math.abs(foot.x)).toBeCloseTo(TAJ_AUTHORED_STAIR_APPROACH_X, 5);
      expect(landing.y).toBeCloseTo(TAJ_AUTHORED_BASE_TOP_Y, 5);
      expect(Math.abs(landing.x)).toBeCloseTo(TAJ_AUTHORED_STAIR_INNER_X, 5);
    }
  });

  it('buries the ramp underside below the terrain so no cavity remains under the flight', () => {
    for (const spec of TAJ_UNLOCKED_STAIR_RAMP_SPECS) {
      const [, halfThickness] = spec.args;
      const upY = Math.cos(spec.rotation[2]);
      // The lowest point of the solid body must sit well below ground level (y=0).
      const bottomCenterY = spec.position[1] - halfThickness * upY;
      expect(bottomCenterY).toBeLessThan(-0.5);
    }
  });
});