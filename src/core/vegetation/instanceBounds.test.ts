import { describe, expect, it } from 'vitest';
import { calculateInstanceFieldBounds } from './instanceBounds';

describe('calculateInstanceFieldBounds', () => {
  it('includes every scaled instance and its vertical extent', () => {
    const { box, sphere } = calculateInstanceFieldBounds([
      { position: [-5, 0, 2], rotationY: 0, scale: 1 },
      { position: [8, 0, -4], rotationY: 1, scale: 2 },
    ], 1, 0, 4);
    expect(box.min.toArray()).toEqual([-6, 0, -6]);
    expect(box.max.toArray()).toEqual([10, 8, 3]);
    expect(sphere.radius).toBeGreaterThan(0);
  });

  it('returns a stable zero-volume bound for an empty field', () => {
    const { box, sphere } = calculateInstanceFieldBounds([], 1);
    expect(box.min.toArray()).toEqual([0, 0, 0]);
    expect(box.max.toArray()).toEqual([0, 0, 0]);
    expect(sphere.radius).toBe(0);
  });
});
