import { describe, expect, it } from 'vitest';
import { beatFloor, clampSunT, computeSunT, sunsetColourAt } from './sunsetMath';

describe('computeSunT', () => {
  it('is the max of the three inputs', () => {
    expect(computeSunT(0.2, 0.5, 0.1)).toBe(0.5);
    expect(computeSunT(0.6, 0.2, 0.3)).toBe(0.6);
    expect(computeSunT(0.1, 0.2, 0.9)).toBe(0.9);
  });

  it('never goes below the persisted story floor (monotonic backtracking guard)', () => {
    // Simulates: player reached 0.6, then backtracks to a beat with a lower floor and low local progress.
    const persistedStoryFloor = 0.6;
    const result = computeSunT(persistedStoryFloor, 0.35, 0.0);
    expect(result).toBe(0.6);
  });

  it('eases up smoothly toward the next floor when local progress exceeds the current floor', () => {
    const result = computeSunT(0.3, 0.35, 0.5);
    expect(result).toBe(0.5);
  });
});

describe('beatFloor', () => {
  it('returns known floors in ascending order matching BEAT_ORDER', () => {
    expect(beatFloor('loading')).toBe(0);
    expect(beatFloor('garden')).toBeGreaterThan(beatFloor('entrance'));
    expect(beatFloor('ending')).toBe(1);
  });
});

describe('clampSunT', () => {
  it('clamps below 0', () => {
    expect(clampSunT(-0.5)).toBe(0);
  });
  it('clamps above 1', () => {
    expect(clampSunT(1.5)).toBe(1);
  });
  it('passes through valid values', () => {
    expect(clampSunT(0.42)).toBe(0.42);
  });
});

describe('sunsetColourAt', () => {
  it('returns the first stop color at sunT=0', () => {
    expect(sunsetColourAt(0)).toBe('#ffe7b3');
  });

  it('returns the last stop color at sunT=1', () => {
    expect(sunsetColourAt(1)).toBe('#2e3352');
  });

  it('interpolates between stops at an intermediate value', () => {
    const color = sunsetColourAt(0.1);
    // Between #ffe7b3 (t=0) and #ffc98a (t=0.2) -> not equal to either endpoint.
    expect(color).not.toBe('#ffe7b3');
    expect(color).not.toBe('#ffc98a');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('clamps out-of-range sunT before lookup', () => {
    expect(sunsetColourAt(-1)).toBe(sunsetColourAt(0));
    expect(sunsetColourAt(2)).toBe(sunsetColourAt(1));
  });

  it('is monotonic in produced brightness trend is not required, but always returns a valid hex for the whole range', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(sunsetColourAt(t)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
