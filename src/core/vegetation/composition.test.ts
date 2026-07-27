import { describe, expect, it } from 'vitest';
import { GARDEN } from '@constants/world';
import { TAJ_AUTHORED_STAIR_APPROACH_X, TAJ_FRONT_Z } from '@constants/tajPlacement';
import {
  COMPOSED_FLOWER_BED_BOUNDS,
  COMPOSED_FLOWER_BED_PALETTE,
  COMPOSED_HEDGE_SEGMENTS,
  COMPOSED_TAJ_FRONT_BED_BOUNDS,
  COMPOSED_TAJ_FRONT_BED_PALETTE,
  COMPOSED_ROCK_INSTANCES,
  COMPOSED_TREE_INSTANCES,
  COMPOSITION_ASYMMETRY,
  GARDEN_COMPOSITION_CENTER_Z,
  TREE_ANCHOR_COUNT,
  createMirroredComposition,
} from './composition';

describe('authored garden composition', () => {
  it('creates four matched-but-not-identical placements per authored anchor', () => {
    const instances = createMirroredComposition([[-10, -40]], 42, [0.9, 1.1]);
    const mirrorBases: Array<[number, number]> = [
      [-10, -40],
      [10, -40],
      [-10, GARDEN_COMPOSITION_CENTER_Z * 2 + 40],
      [10, GARDEN_COMPOSITION_CENTER_Z * 2 + 40],
    ];
    expect(instances).toHaveLength(4);
    // Each quarter stays near its formal mirror position (macro-symmetry kept)…
    const tolerance = COMPOSITION_ASYMMETRY + 1.2; // asymmetry jitter + max quadrant drift
    instances.forEach(({ position }, i) => {
      expect(Math.abs(position[0] - mirrorBases[i][0])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(position[2] - mirrorBases[i][1])).toBeLessThanOrEqual(tolerance);
    });
    // …but is not a pixel-perfect copy (Phase 10A asymmetry).
    const exactlyMirrored = instances.every(
      ({ position }, i) => position[0] === mirrorBases[i][0] && position[2] === mirrorBases[i][1],
    );
    expect(exactlyMirrored).toBe(false);
    expect(new Set(instances.map(({ rotationY }) => rotationY)).size).toBeGreaterThan(1);
  });

  it('keeps the production tree composition dense and rocks intentionally restrained', () => {
    expect(COMPOSED_TREE_INSTANCES).toHaveLength(28);
    expect(COMPOSED_ROCK_INSTANCES).toHaveLength(8);
  });

  // Phase 10D: `Trees.tsx` assigns a species per *anchor* and recovers the
  // anchor from the instance index as `floor(index / (length / anchorCount))`.
  // That arithmetic is only valid while the mirror expansion emits its four
  // placements consecutively per anchor, so pin both facts here — a change to
  // either would silently re-species the whole garden rather than fail.
  it('emits four consecutive instances per tree anchor, in anchor order', () => {
    expect(TREE_ANCHOR_COUNT).toBe(7);
    const perAnchor = COMPOSED_TREE_INSTANCES.length / TREE_ANCHOR_COUNT;
    expect(perAnchor).toBe(4);

    // Anchors 4/5/6 are the inner row, planted with the columnar species.
    for (const [anchor, expectedX, expectedZ] of [[4, 12, -40], [5, 12, -52], [6, 12, -64]] as const) {
      const group = COMPOSED_TREE_INSTANCES.slice(anchor * perAnchor, (anchor + 1) * perAnchor);
      expect(group).toHaveLength(4);
      for (const { position } of group) {
        expect(Math.abs(Math.abs(position[0]) - expectedX)).toBeLessThanOrEqual(2.5);
      }
      expect(Math.abs(Math.abs(group[0].position[2]) - Math.abs(expectedZ))).toBeLessThanOrEqual(2.5);
    }
  });

  // The reason the authored anchors can carry a tree layer at all: none of
  // them encroaches on the central path, so the Taj sightline stays open.
  it('keeps every tree anchor clear of the central axis sightline', () => {
    for (const { position } of COMPOSED_TREE_INSTANCES) {
      expect(Math.abs(position[0])).toBeGreaterThan(GARDEN.mainPathWidth);
    }
  });

  it('defines two layered formal parterres per quarter with valid bounds', () => {
    expect(COMPOSED_FLOWER_BED_BOUNDS).toHaveLength(8);
    expect(COMPOSED_FLOWER_BED_PALETTE).toHaveLength(COMPOSED_FLOWER_BED_BOUNDS.length);
    for (const bounds of COMPOSED_FLOWER_BED_BOUNDS) {
      expect(bounds.minX).toBeLessThan(bounds.maxX);
      expect(bounds.minZ).toBeLessThan(bounds.maxZ);
      expect((bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ)).toBeGreaterThan(140);
    }
  });

  it('mirrors thin Taj-front beds beyond both authored stair approaches', () => {
    expect(COMPOSED_TAJ_FRONT_BED_BOUNDS).toHaveLength(2);
    expect(COMPOSED_TAJ_FRONT_BED_PALETTE).toHaveLength(2);
    const [left, right] = COMPOSED_TAJ_FRONT_BED_BOUNDS;
    expect(left.maxX).toBeLessThan(-TAJ_AUTHORED_STAIR_APPROACH_X);
    expect(right.minX).toBeGreaterThan(TAJ_AUTHORED_STAIR_APPROACH_X);
    expect(left.minX).toBe(-right.maxX);
    expect(left.maxX).toBe(-right.minX);
    for (const bounds of COMPOSED_TAJ_FRONT_BED_BOUNDS) {
      expect(bounds.minZ).toBeGreaterThan(TAJ_FRONT_Z);
      expect(bounds.maxZ - bounds.minZ).toBeCloseTo(0.9, 6);
    }
  });

  it('leaves a fourteen-metre cross-axis gateway in each boundary hedge', () => {
    expect(COMPOSED_HEDGE_SEGMENTS[1].fromZ - COMPOSED_HEDGE_SEGMENTS[0].toZ).toBe(14);
  });
});
