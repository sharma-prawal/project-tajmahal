import { describe, expect, it } from 'vitest';
import {
  LANDMARK_FLAME_Y,
  LANDMARK_MARBLE_HEIGHT,
  createLandmarkFlameGeometry,
  createLandmarkPillarGeometry,
  createLandmarkProgressArcGeometry,
  createLandmarkRingGeometry,
} from './landmarkGeometry';

describe('memory landmark geometry', () => {
  /**
   * The failure this guards against shipped once and was caught only by
   * looking at a screenshot: the inlay ring rendered solid black in all four
   * states. three r169 applies `vColor` to the diffuse only under `USE_COLOR`,
   * so per-instance tinting needs `vertexColors: true` on the material — and
   * `vertexColors` with no geometry `color` attribute samples an undefined
   * attribute as zero, i.e. black. Any geometry drawn with a per-instance
   * colour must therefore carry a colour attribute.
   */
  it('gives every per-instance-tinted geometry a colour attribute', () => {
    for (const [name, geometry] of [
      ['ring', createLandmarkRingGeometry()],
      ['flame', createLandmarkFlameGeometry()],
    ] as const) {
      const color = geometry.getAttribute('color');
      expect(color, `${name} has no colour attribute — it would render black`).toBeDefined();
      expect(color.count).toBe(geometry.getAttribute('position').count);
      expect(color.itemSize).toBe(3);
      // White, so the instance colour passes through unchanged.
      expect(Array.from({ length: color.count * 3 }, (_, i) => color.array[i]).every((v) => v === 1)).toBe(true);
    }
  });

  it('stands the marble on y = 0 at its documented height', () => {
    const pillar = createLandmarkPillarGeometry();
    pillar.computeBoundingBox();
    const box = pillar.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 2);
    expect(box.max.y).toBeCloseTo(LANDMARK_MARBLE_HEIGHT, 1);
  });

  /**
   * The flame must stand *proud of the cup rim*. The first build enclosed it
   * under a finial hood, and it was invisible from every angle — a lamp that
   * could never be seen to light, which is the entire state language gone.
   */
  it('stands the flame proud of the lamp cup rim', () => {
    const flame = createLandmarkFlameGeometry();
    flame.computeBoundingBox();
    const box = flame.boundingBox!;
    expect(box.max.y, 'flame tip is below the marble rim — it would be hidden')
      .toBeGreaterThan(LANDMARK_MARBLE_HEIGHT);
    // …but still seated in the cup, not floating above it.
    expect(box.min.y).toBeLessThan(LANDMARK_MARBLE_HEIGHT);
    expect(box.min.y).toBeGreaterThan(LANDMARK_FLAME_Y - 0.25);
  });

  it('sweeps the reveal arc monotonically with progress', () => {
    const counts = [0.1, 0.5, 1].map((p) => {
      const arc = createLandmarkProgressArcGeometry(p);
      arc.computeBoundingBox();
      return arc.boundingBox!.max.x - arc.boundingBox!.min.x;
    });
    expect(counts[0]).toBeLessThan(counts[2]);
  });

  it('never produces a degenerate arc at zero progress', () => {
    const arc = createLandmarkProgressArcGeometry(0);
    expect(arc.getAttribute('position').count).toBeGreaterThan(0);
  });
});
