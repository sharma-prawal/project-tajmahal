import { describe, expect, it } from 'vitest';
import { resolveCameraCollisionDistance } from './cameraCollision';

describe('resolveCameraCollisionDistance', () => {
  it('pulls the camera in immediately with a safety margin', () => {
    expect(resolveCameraCollisionDistance({ desiredDistance: 7, currentDistance: 7, hitDistance: 3, minimumDistance: 1.25, margin: 0.28, releaseSmoothing: 10, delta: 1 / 60 })).toBeCloseTo(2.72);
  });

  it('never crosses the minimum collision distance', () => {
    expect(resolveCameraCollisionDistance({ desiredDistance: 7, currentDistance: 7, hitDistance: 0.4, minimumDistance: 1.25, margin: 0.28, releaseSmoothing: 10, delta: 1 / 60 })).toBe(1.25);
  });

  it('releases smoothly toward the desired distance when clear', () => {
    const result = resolveCameraCollisionDistance({ desiredDistance: 7, currentDistance: 2, hitDistance: null, minimumDistance: 1.25, margin: 0.28, releaseSmoothing: 10, delta: 1 / 60 });
    expect(result).toBeGreaterThan(2);
    expect(result).toBeLessThan(7);
  });
});
