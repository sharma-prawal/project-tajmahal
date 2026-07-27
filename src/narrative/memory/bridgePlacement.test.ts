import { describe, expect, it } from 'vitest';
import { AXIS_LAYOUT } from '@constants/world';
import { TAJ_AUTHORED_BASE_TOP_Y, TAJ_MAIN_DOOR_APPROACH_Z } from '@constants/tajPlacement';
import {
  MINARET_POSITIONS,
  POOL_WATER,
  TAJ_MODEL_FOOTPRINT,
  groundHeightAt,
  isOnPlatformTop,
  placementViolations,
} from './bridgePlacement';

describe('Phase 10F.2 — bridge placement safety', () => {
  it('rejects a position in the reflecting pool', () => {
    const violations = placementViolations(0, -125);
    expect(violations.map((v) => v.rule)).toContain('pool-water');
  });

  it('rejects a position inside the Taj model footprint', () => {
    const violations = placementViolations(0, -210);
    expect(violations.map((v) => v.rule)).toContain('taj-footprint');
  });

  it('rejects a position outside the walkable world', () => {
    expect(placementViolations(80, -70).map((v) => v.rule)).toContain('navigation-bounds');
    expect(placementViolations(0, 30).map((v) => v.rule)).toContain('navigation-bounds');
  });

  /**
   * The failure this rule exists to catch: an All-Day Call candidate placed
   * on the axis at (0, -174) looked reasonable on paper and would have laid
   * nine cadence bars straight down the ceremonial walk the player must use
   * to reach the door.
   */
  it('rejects a position blocking the central axis walk', () => {
    const violations = placementViolations(0, -174);
    expect(violations.map((v) => v.rule)).toContain('primary-walkway');
  });

  it('allows the intentional final-memory destination at the main door threshold', () => {
    expect(placementViolations(0, TAJ_MAIN_DOOR_APPROACH_Z)).toEqual([]);
  });

  it('rejects a position blocking the garden cross-axis walk', () => {
    expect(placementViolations(20, -75).map((v) => v.rule)).toContain('primary-walkway');
  });

  it('rejects a position inside a minaret base', () => {
    const minaret = MINARET_POSITIONS[0];
    expect(placementViolations(minaret.x, minaret.z).map((v) => v.rule)).toContain('minaret-base');
  });

  it('accepts the staged garden and platform positions', () => {
    for (const [x, z] of [
      [-24, -64], [-24, -105], [-20, -126], [15, -170], [6.5, -176],
    ] as const) {
      expect(placementViolations(x, z), `(${x}, ${z}) should be safe`).toEqual([]);
    }
  });

  /**
   * The single easiest mistake when moving a narrative onto the platform:
   * authoring it with the garden's Y and burying it 3.2 m underground.
   */
  it('reports the authored Taj base height only inside its footprint', () => {
    expect(groundHeightAt(0, -126)).toBe(0);
    expect(groundHeightAt(0, -170)).toBe(TAJ_AUTHORED_BASE_TOP_Y);
    expect(groundHeightAt(0, AXIS_LAYOUT.stairsEnd)).toBe(TAJ_AUTHORED_BASE_TOP_Y);
    expect(groundHeightAt(-28.5, -170)).toBe(0);
  });

  it('identifies the platform top surface', () => {
    expect(isOnPlatformTop(15, -170)).toBe(true);
    expect(isOnPlatformTop(15, -126)).toBe(false);
    expect(isOnPlatformTop(30, -170)).toBe(false);
  });

  it('pins the measured world rectangles the rules derive from', () => {
    expect(POOL_WATER).toEqual({ minX: -16, maxX: 16, minZ: -129, maxZ: -121 });
    // 43 m footprint centred on the mausoleum — the Phase 10E.2 measurement.
    expect(TAJ_MODEL_FOOTPRINT.maxZ).toBeCloseTo(-194.5, 2);
    expect(MINARET_POSITIONS).toHaveLength(4);
  });
});
