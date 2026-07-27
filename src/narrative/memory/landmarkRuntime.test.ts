import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
import {
  createLandmarkBandGeometry,
  createLandmarkFlameGeometry,
  createLandmarkPillarGeometry,
  createLandmarkRingGeometry,
} from './landmarkGeometry';
import { LANDMARK_PLACEMENTS } from './landmarkPlacement';
import { MEMORY_DEFINITIONS } from './definitions';

/**
 * Phase 10E.1 — runtime-shaped checks on the landmark set.
 *
 * Two prior defects in this system were invisible to lint, typecheck and every
 * unit test, and were caught only by looking at a rendered frame:
 *
 * - the whole set was frustum-culled because drei derives its culling sphere
 *   from the base geometry at the origin, ignoring instance offsets;
 * - the inlay rendered black because `vertexColors` without a geometry colour
 *   attribute samples an undefined attribute as zero.
 *
 * These assert the invariants behind both, plus the aggregate bounds the
 * culling fix depends on, so a regression fails here rather than in a capture.
 */
describe('landmark runtime invariants', () => {
  const GEOMETRIES = {
    pillar: createLandmarkPillarGeometry(),
    ring: createLandmarkRingGeometry(),
    band: createLandmarkBandGeometry(),
    flame: createLandmarkFlameGeometry(),
  };

  it('builds every geometry with finite, non-empty position data', () => {
    for (const [name, geometry] of Object.entries(GEOMETRIES)) {
      const position = geometry.getAttribute('position');
      expect(position, `${name} has no position attribute`).toBeDefined();
      expect(position.count, `${name} is empty`).toBeGreaterThan(0);
      const array = position.array as ArrayLike<number>;
      for (let i = 0; i < array.length; i += 1) {
        expect(Number.isFinite(array[i]), `${name} has a non-finite vertex`).toBe(true);
      }
    }
  });

  /** The black-inlay bug: per-instance tinting needs a colour attribute. */
  it('gives every per-instance-tinted geometry a white colour attribute', () => {
    for (const name of ['ring', 'band', 'flame'] as const) {
      const color = GEOMETRIES[name].getAttribute('color');
      expect(color, `${name} would render black`).toBeDefined();
      expect(color.count).toBe(GEOMETRIES[name].getAttribute('position').count);
    }
  });

  /**
   * The frustum-culling bug: `CulledInstances` recomputes aggregate bounds, and
   * those bounds must actually span the placed lamps. If this collapses toward
   * the origin the whole set disappears off-axis.
   */
  it('spans the whole world once instance transforms are applied', () => {
    const bounds = new Box3();
    const vertex = new Vector3();
    const matrix = new Matrix4();
    const position = GEOMETRIES.pillar.getAttribute('position');

    for (const placement of LANDMARK_PLACEMENTS) {
      matrix.compose(
        new Vector3(...placement.position),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), placement.rotationY),
        new Vector3(1, 1, 1),
      );
      for (let i = 0; i < position.count; i += 1) {
        bounds.expandByPoint(vertex.fromBufferAttribute(position, i).applyMatrix4(matrix));
      }
    }

    const size = bounds.getSize(new Vector3());
    // m1 at z ~ -58 through the Taj-base m7 at z ~ -169.
    expect(size.z).toBeGreaterThan(105);
    expect(size.x).toBeGreaterThan(50);
    expect(bounds.min.y).toBeGreaterThan(-1e-6); // float epsilon, not below ground
  });

  it('keeps every lamp standing inside its own trigger volume', () => {
    for (const placement of LANDMARK_PLACEMENTS) {
      const definition = MEMORY_DEFINITIONS.find((candidate) => candidate.id === placement.memoryId)!;
      const distance = Math.hypot(
        placement.position[0] - definition.location.x,
        placement.position[2] - definition.location.z,
      );
      expect(distance, `${placement.memoryId} lamp is outside its volume`).toBeLessThan(definition.discoveryRadius);
    }
  });

  /**
   * A Step 8 requirement, and a real one: the cheapest way to "fix" landmark
   * readability would be a light per lamp, which would be ten new shadow
   * casters in a scene whose lighting is out of scope. Asserted against the
   * component source, because that is where such a regression would appear.
   */
  it('introduces no lights', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('./MemoryLandmarks.tsx', import.meta.url), 'utf8');
    for (const light of ['pointLight', 'spotLight', 'directionalLight', 'hemisphereLight', 'rectAreaLight']) {
      expect(source, `MemoryLandmarks introduced a ${light}`).not.toContain(light);
    }
  });

  it('uses only unlit materials for the state cues', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('./MemoryLandmarks.tsx', import.meta.url), 'utf8');
    // One lit material (the marble) and three unlit state cues.
    expect(source.match(/meshStandardMaterial/g) ?? []).toHaveLength(1);
    expect((source.match(/meshBasicMaterial/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('stays within a modest triangle budget for ten lamps', () => {
    const perLamp = Object.values(GEOMETRIES).reduce((total, geometry) => {
      const index = geometry.getIndex();
      return total + (index ? index.count : geometry.getAttribute('position').count) / 3;
    }, 0);
    expect(perLamp * LANDMARK_PLACEMENTS.length).toBeLessThan(6000);
  });
});
