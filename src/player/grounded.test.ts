import { describe, expect, it } from 'vitest';
import { classifySlope, evaluateGrounded, groundSnapCorrection, GROUND_CAST_MAX_DISTANCE, MAX_WALKABLE_SLOPE_DEG, selectGroundHit } from './grounded';

describe('classifySlope', () => {
  it('classifies a flat surface (normal straight up) as 0 degrees, walkable', () => {
    const result = classifySlope({ x: 0, y: 1, z: 0 });
    expect(result.angleDeg).toBeCloseTo(0, 5);
    expect(result.walkable).toBe(true);
  });

  it('classifies a ramp at ~20 degrees (the stairs ramp collider) as walkable', () => {
    // rise 3.2 over run 9 -> atan(3.2/9) ~= 19.6deg. Normal tilted by that angle from up.
    const angle = Math.atan(3.2 / 9);
    const normal = { x: Math.sin(angle), y: Math.cos(angle), z: 0 };
    const result = classifySlope(normal);
    expect(result.angleDeg).toBeCloseTo((angle * 180) / Math.PI, 2);
    expect(result.walkable).toBe(true);
  });

  it('classifies a vertical wall (normal horizontal) as 90 degrees, not walkable', () => {
    const result = classifySlope({ x: 1, y: 0, z: 0 });
    expect(result.angleDeg).toBeCloseTo(90, 5);
    expect(result.walkable).toBe(false);
  });

  it('is right at the walkable boundary at MAX_WALKABLE_SLOPE_DEG', () => {
    const rad = (MAX_WALKABLE_SLOPE_DEG * Math.PI) / 180;
    const normal = { x: Math.sin(rad), y: Math.cos(rad), z: 0 };
    const result = classifySlope(normal);
    expect(result.walkable).toBe(true);
  });

  it('normalizes a non-unit normal vector', () => {
    const result = classifySlope({ x: 0, y: 5, z: 0 });
    expect(result.angleDeg).toBeCloseTo(0, 5);
  });
});

describe('ground snap', () => {
  it('closes small downward walkable gaps without launching or snapping distant falls', () => {
    expect(groundSnapCorrection(.08, -.2)).toBeCloseTo(-.08);
    expect(groundSnapCorrection(.08, .2)).toBe(0);
    expect(groundSnapCorrection(.3, -.2)).toBe(0);
    expect(groundSnapCorrection(null, -.2)).toBe(0);
  });
});

describe('selectGroundHit', () => {
  it('uses walkable ground beneath a steep stair-edge hit', () => {
    const wall = { distance: 0, normal: { x: 1, y: 0, z: 0 } };
    const ground = { distance: 0.01, normal: { x: 0, y: 1, z: 0 } };
    expect(selectGroundHit(wall, ground)).toBe(ground);
  });

  it('keeps a walkable primary hit and never turns two walls into ground', () => {
    const ground = { distance: 0.01, normal: { x: 0, y: 1, z: 0 } };
    const wall = { distance: 0, normal: { x: 1, y: 0, z: 0 } };
    expect(selectGroundHit(ground, wall)).toBe(ground);
    expect(selectGroundHit(wall, wall)).toBe(wall);
  });
});

describe('evaluateGrounded', () => {
  it('is not grounded when there is no hit (stepping off an edge)', () => {
    const result = evaluateGrounded(null);
    expect(result.grounded).toBe(false);
    expect(result.distance).toBeNull();
  });

  it('is grounded when a close, flat hit is within range', () => {
    const result = evaluateGrounded({ distance: 0.05, normal: { x: 0, y: 1, z: 0 } });
    expect(result.grounded).toBe(true);
    expect(result.slope?.walkable).toBe(true);
  });

  it('is not grounded when the hit is beyond max distance (falling/jumping off)', () => {
    const result = evaluateGrounded(
      { distance: GROUND_CAST_MAX_DISTANCE + 1, normal: { x: 0, y: 1, z: 0 } },
      GROUND_CAST_MAX_DISTANCE,
    );
    expect(result.grounded).toBe(false);
  });

  it('is not grounded on a too-steep surface even at close distance (rejection, not sliding)', () => {
    const result = evaluateGrounded({ distance: 0.02, normal: { x: 1, y: 0.1, z: 0 } });
    expect(result.grounded).toBe(false);
    expect(result.slope?.walkable).toBe(false);
  });

  it('regains grounded state on the next evaluation after landing', () => {
    const airborne = evaluateGrounded(null);
    expect(airborne.grounded).toBe(false);
    const landed = evaluateGrounded({ distance: 0.03, normal: { x: 0, y: 1, z: 0 } });
    expect(landed.grounded).toBe(true);
  });
});
