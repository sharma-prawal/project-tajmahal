import { describe, expect, it } from 'vitest';
import { expandBounds, placeVegetation, type Bounds2D } from './placement';

const BOUNDS: Bounds2D = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };

describe('placeVegetation', () => {
  it('is deterministic for a given seed', () => {
    const a = placeVegetation({ bounds: BOUNDS, cellSize: 3, jitter: 0.6, exclusions: [], skipProbability: 0.2, scaleRange: [0.8, 1.2], seed: 42 });
    const b = placeVegetation({ bounds: BOUNDS, cellSize: 3, jitter: 0.6, exclusions: [], skipProbability: 0.2, scaleRange: [0.8, 1.2], seed: 42 });
    expect(a).toEqual(b);
  });

  it('produces a different layout for a different seed', () => {
    const a = placeVegetation({ bounds: BOUNDS, cellSize: 3, jitter: 0.6, exclusions: [], skipProbability: 0.2, scaleRange: [0.8, 1.2], seed: 1 });
    const b = placeVegetation({ bounds: BOUNDS, cellSize: 3, jitter: 0.6, exclusions: [], skipProbability: 0.2, scaleRange: [0.8, 1.2], seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('never places an instance inside an exclusion zone', () => {
    const exclusion: Bounds2D = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const instances = placeVegetation({ bounds: BOUNDS, cellSize: 1.5, jitter: 0.8, exclusions: [exclusion], skipProbability: 0, scaleRange: [1, 1], seed: 7 });
    for (const instance of instances) {
      const [x, , z] = instance.position;
      const inside = x >= exclusion.minX && x <= exclusion.maxX && z >= exclusion.minZ && z <= exclusion.maxZ;
      expect(inside).toBe(false);
    }
  });

  it('never places an instance outside the outer bounds', () => {
    const instances = placeVegetation({ bounds: BOUNDS, cellSize: 2, jitter: 0.9, exclusions: [], skipProbability: 0, scaleRange: [1, 1], seed: 3 });
    for (const instance of instances) {
      const [x, , z] = instance.position;
      expect(x).toBeGreaterThanOrEqual(BOUNDS.minX);
      expect(x).toBeLessThanOrEqual(BOUNDS.maxX);
      expect(z).toBeGreaterThanOrEqual(BOUNDS.minZ);
      expect(z).toBeLessThanOrEqual(BOUNDS.maxZ);
    }
  });

  it('skipProbability=1 places nothing', () => {
    const instances = placeVegetation({ bounds: BOUNDS, cellSize: 2, jitter: 0.5, exclusions: [], skipProbability: 1, scaleRange: [1, 1], seed: 9 });
    expect(instances).toHaveLength(0);
  });

  it('respects the given scale range', () => {
    const instances = placeVegetation({ bounds: BOUNDS, cellSize: 2, jitter: 0.5, exclusions: [], skipProbability: 0, scaleRange: [0.7, 1.4], seed: 11 });
    expect(instances.length).toBeGreaterThan(0);
    for (const instance of instances) {
      expect(instance.scale).toBeGreaterThanOrEqual(0.7);
      expect(instance.scale).toBeLessThanOrEqual(1.4);
    }
  });
});

describe('expandBounds', () => {
  it('grows a rectangle uniformly on every side', () => {
    const result = expandBounds({ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, 2);
    expect(result).toEqual({ minX: -2, maxX: 12, minZ: -2, maxZ: 12 });
  });
});
