import { describe, expect, it } from 'vitest';
import { clamp, damp } from './math';

describe('clamp', () => {
  it('passes values inside the range through unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below the minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above the maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('damp', () => {
  it('does not move when delta is zero', () => {
    expect(damp(0, 10, 5, 0)).toBe(0);
  });

  it('moves toward the target without overshooting', () => {
    const result = damp(0, 10, 5, 1 / 60);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });

  it('converges to the target over many steps', () => {
    let value = 0;
    for (let i = 0; i < 600; i += 1) {
      value = damp(value, 10, 5, 1 / 60);
    }
    expect(value).toBeCloseTo(10, 2);
  });

  it('is frame-rate independent given the same elapsed time', () => {
    let a = 0;
    for (let i = 0; i < 60; i += 1) a = damp(a, 10, 5, 1 / 60);

    let b = 0;
    for (let i = 0; i < 30; i += 1) b = damp(b, 10, 5, 1 / 30);

    expect(a).toBeCloseTo(b, 5);
  });
});
