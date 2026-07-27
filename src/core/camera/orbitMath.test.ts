import { describe, expect, it } from 'vitest';
import { computeOrbitOffset } from './orbitMath';

describe('computeOrbitOffset', () => {
  it('places the camera directly behind on +Z at yaw/pitch zero', () => {
    const offset = computeOrbitOffset(0, 0, 6, 3);
    expect(offset.x).toBeCloseTo(0, 5);
    expect(offset.z).toBeCloseTo(6, 5);
    expect(offset.y).toBeCloseTo(3, 5);
  });

  it('orbits horizontally as yaw changes, keeping distance constant', () => {
    const offset = computeOrbitOffset(Math.PI / 2, 0, 6, 3);
    expect(offset.x).toBeCloseTo(6, 5);
    expect(offset.z).toBeCloseTo(0, 5);
    expect(Math.hypot(offset.x, offset.z)).toBeCloseTo(6, 5);
  });

  it('raises the camera and shrinks the horizontal radius as pitch increases', () => {
    const level = computeOrbitOffset(0, 0, 6, 3);
    const pitched = computeOrbitOffset(0, Math.PI / 6, 6, 3);
    expect(pitched.y).toBeGreaterThan(level.y);
    expect(pitched.z).toBeLessThan(level.z);
  });
});
