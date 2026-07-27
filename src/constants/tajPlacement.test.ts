import { describe, expect, it } from 'vitest';
import { PLATFORM } from './world';
import {
  TAJ_AUTHORED_BASE_TOP_Y,
  TAJ_APPROACH_FOOT_Z,
  TAJ_AUTHORED_STAIR_CENTER_Z,
  TAJ_AUTHORED_STAIR_DEPTH,
  TAJ_AUTHORED_STAIR_INNER_X,
  TAJ_AUTHORED_STAIR_OUTER_X,
  TAJ_FRONT_Z,
  TAJ_PRESENTATION_FOOTPRINT,
  TAJ_PRESENTATION_SCALE,
} from './tajPlacement';

describe('production Taj presentation scale', () => {
  it('matches the removed chabutra footprint with the asset own authored base', () => {
    expect(TAJ_PRESENTATION_FOOTPRINT).toBe(PLATFORM.width);
    expect(TAJ_PRESENTATION_SCALE).toBeCloseTo(4 / 3, 6);
  });

  it('scales the authored base height with the complete monument', () => {
    expect(TAJ_AUTHORED_BASE_TOP_Y).toBeCloseTo(3.6, 6);
  });

  it('keeps the ceremonial path in front of the Taj while both flights climb inward from the sides', () => {
    expect(TAJ_APPROACH_FOOT_Z).toBeGreaterThan(TAJ_FRONT_Z);
    expect(TAJ_AUTHORED_STAIR_CENTER_Z).toBeCloseTo(TAJ_FRONT_Z - TAJ_AUTHORED_STAIR_DEPTH / 2, 6);
    expect(TAJ_AUTHORED_STAIR_OUTER_X).toBeGreaterThan(TAJ_AUTHORED_STAIR_INNER_X);
  });
});
