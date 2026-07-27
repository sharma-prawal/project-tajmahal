import { describe, expect, it } from 'vitest';
import { calcPosFromAngles } from '@react-three/drei';
import { skyInclinationFromElevation } from './skyMath';

describe('skyInclinationFromElevation', () => {
  it('maps the horizon to Drei Sky inclination 0.5', () => {
    expect(skyInclinationFromElevation(0)).toBe(0.5);
  });

  it('keeps morning elevations above the horizon', () => {
    const position = calcPosFromAngles(skyInclinationFromElevation(12), 0.5);
    expect(position.y).toBeCloseTo(Math.sin((12 * Math.PI) / 180), 6);
    expect(position.y).toBeGreaterThan(0);
  });

  it('keeps the final -2 degree sunset just below the horizon', () => {
    const position = calcPosFromAngles(skyInclinationFromElevation(-2), 0.5);
    expect(position.y).toBeCloseTo(Math.sin((-2 * Math.PI) / 180), 6);
    expect(position.y).toBeLessThan(0);
  });
});

