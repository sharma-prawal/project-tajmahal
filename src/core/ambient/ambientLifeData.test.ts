import { describe, expect, it } from 'vitest';
import { AMBIENT_LIFE } from '@constants/ambientLife';
import { AMBIENT_LIFE_BOUNDS, createAmbientLifeData } from './ambientLifeData';

describe('createAmbientLifeData', () => {
  it('is deterministic for a seed and changes for a different seed', () => {
    const first = createAmbientLifeData(42);
    const again = createAmbientLifeData(42);
    const different = createAmbientLifeData(43);
    expect([...first.positions]).toEqual([...again.positions]);
    expect([...first.phases]).toEqual([...again.phases]);
    expect([...first.positions]).not.toEqual([...different.positions]);
  });

  it('produces the authored family counts, ranks, and world bounds', () => {
    const data = createAmbientLifeData();
    const expectedTotal = Object.values(AMBIENT_LIFE.counts).reduce((sum, count) => sum + count, 0);
    expect(data.families).toHaveLength(expectedTotal);
    expect(data.positions).toHaveLength(expectedTotal * 3);
    expect(Math.min(...data.ranks)).toBeGreaterThan(0);
    expect(Math.max(...data.ranks)).toBeLessThanOrEqual(1);
    for (let index = 0; index < expectedTotal; index += 1) {
      expect(data.positions[index * 3]).toBeGreaterThanOrEqual(AMBIENT_LIFE_BOUNDS.minX);
      expect(data.positions[index * 3]).toBeLessThanOrEqual(AMBIENT_LIFE_BOUNDS.maxX);
      expect(data.positions[index * 3 + 1]).toBeGreaterThanOrEqual(AMBIENT_LIFE_BOUNDS.minY);
      expect(data.positions[index * 3 + 1]).toBeLessThanOrEqual(AMBIENT_LIFE_BOUNDS.maxY);
      expect(data.positions[index * 3 + 2]).toBeGreaterThanOrEqual(AMBIENT_LIFE_BOUNDS.minZ);
      expect(data.positions[index * 3 + 2]).toBeLessThanOrEqual(AMBIENT_LIFE_BOUNDS.maxZ);
    }
  });
});
