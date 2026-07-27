import { describe, expect, it } from 'vitest';
import { environmentalMotionScale, environmentalWindTime } from './windModel';

describe('environmental wind model', () => {
  it('fully suppresses decorative motion when reduced motion is enabled', () => {
    expect(environmentalMotionScale(true)).toBe(0);
    expect(environmentalMotionScale(false)).toBe(1);
  });

  it('derives time from the absolute clock instead of frame count', () => {
    expect(environmentalWindTime(10, 0.48)).toBeCloseTo(4.8);
    expect(environmentalWindTime(-1, 0.48)).toBe(0);
    expect(environmentalWindTime(10, -1)).toBe(0);
  });
});

