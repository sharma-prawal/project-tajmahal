import { describe, expect, it } from 'vitest';
import { PLAYER_CAPSULE } from '@constants/physics';
import { TAJ_CENTER_Z, TAJ_MAIN_DOOR_Z, TAJ_PRESENTATION_FOOTPRINT } from '@constants/tajPlacement';
import { TAJ_CENTRAL_STRUCTURE_COLLIDER_SPEC, TAJ_MINARET_COLLIDER_SPECS } from './tajCollision';

describe('Taj central structure collision', () => {
  it('blocks the tomb while leaving a walkable terrace around every side', () => {
    const [halfWidth, , halfDepth] = TAJ_CENTRAL_STRUCTURE_COLLIDER_SPEC.args;
    const [centerX, , centerZ] = TAJ_CENTRAL_STRUCTURE_COLLIDER_SPEC.position;
    const terraceHalfSize = TAJ_PRESENTATION_FOOTPRINT / 2;
    const minimumClearance = PLAYER_CAPSULE.radius * 2;

    expect(terraceHalfSize - (Math.abs(centerX) + halfWidth)).toBeGreaterThan(minimumClearance);
    expect(terraceHalfSize - (Math.abs(centerZ) + halfDepth)).toBeGreaterThan(minimumClearance);
    expect(halfWidth * 2).toBeCloseTo(26.87, 1);
    expect(halfDepth * 2).toBeCloseTo(26.87, 1);
    expect(TAJ_MAIN_DOOR_Z).toBeCloseTo(TAJ_CENTER_Z + centerZ + halfDepth, 6);
  });

  it('blocks each minaret without closing the paths around the tomb', () => {
    const [tombHalfWidth] = TAJ_CENTRAL_STRUCTURE_COLLIDER_SPEC.args;
    const minimumClearance = PLAYER_CAPSULE.radius * 2;

    expect(TAJ_MINARET_COLLIDER_SPECS).toHaveLength(4);
    for (const spec of TAJ_MINARET_COLLIDER_SPECS) {
      const [, radius] = spec.args;
      const [x, , z] = spec.position;
      expect(TAJ_PRESENTATION_FOOTPRINT / 2 - (Math.abs(x) + radius)).toBeGreaterThan(0);
      expect(TAJ_PRESENTATION_FOOTPRINT / 2 - (Math.abs(z) + radius)).toBeGreaterThan(0);
      expect(Math.abs(x) - radius - tombHalfWidth).toBeGreaterThan(4.5);
      expect(Math.abs(z) - radius - tombHalfWidth).toBeGreaterThan(4.5);
      expect(Math.abs(x) - radius - tombHalfWidth).toBeGreaterThan(minimumClearance);
    }
  });
});