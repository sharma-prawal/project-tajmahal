import { describe, expect, it } from 'vitest';
import { AXIS_LAYOUT, GARDEN } from '@constants/world';
import { createAtmosphereParticleData } from './particleData';

describe('atmospheric particle data', () => {
  it('is deterministic for a fixed seed', () => {
    expect(createAtmosphereParticleData(32, 51)).toEqual(createAtmosphereParticleData(32, 51));
  });

  it('changes with the seed and remains inside the garden atmosphere volume', () => {
    const first = createAtmosphereParticleData(40, 1);
    const second = createAtmosphereParticleData(40, 2);
    expect(first.positions).not.toEqual(second.positions);
    const centerZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
    for (let index = 0; index < 40; index += 1) {
      expect(Math.abs(first.positions[index * 3])).toBeLessThanOrEqual(GARDEN.usableWidth * 0.45);
      expect(first.positions[index * 3 + 1]).toBeGreaterThanOrEqual(0.55);
      expect(first.positions[index * 3 + 1]).toBeLessThanOrEqual(5.2);
      expect(Math.abs(first.positions[index * 3 + 2] - centerZ)).toBeLessThanOrEqual(GARDEN.axisLength * 0.48);
    }
  });
});
