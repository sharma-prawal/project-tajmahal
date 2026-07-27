import { describe, expect, it } from 'vitest';
import { BoxGeometry, CylinderGeometry, Mesh } from 'three';
import { GARDEN_SURFACE_Y, plantedY, rootCrownY, supportedY, treePlantedY, trunkFootprintRadius } from './grounding';

describe('garden prop grounding', () => {
  it('places a supported prop bottom exactly on the rendered garden surface', () => {
    const prop = new Mesh(new BoxGeometry(1, 2, 1));
    prop.position.y = 2.5;
    const scale = 1.4;
    const y = supportedY(prop, scale);
    expect(y + 1.5 * scale).toBeCloseTo(GARDEN_SURFACE_Y);
  });

  it('buries each authored root ball by its own scaled depth', () => {
    expect(plantedY()).toBe(GARDEN_SURFACE_Y);
    const tree = new Mesh(new BoxGeometry(2, 6, 2));
    tree.position.y = 2;
    // Bounds are -1..5: at scale 1.5, 25% of the one-metre root remains visible.
    expect(treePlantedY(tree, 1.5, 0.25)).toBeCloseTo(GARDEN_SURFACE_Y - 1.125);
  });

  it('buries a root ball while preserving a visible crown', () => {
    const tree = new Mesh(new BoxGeometry(1, 9, 1));
    tree.position.y = 2.5;
    expect(rootCrownY(tree, 1, 1.5)).toBeCloseTo(GARDEN_SURFACE_Y + 0.5);
  });
});

describe('trunk footprint measurement', () => {
  it('measures the trunk radius from a low slice and ignores the canopy', () => {
    // Trunk radius 0.5, base at y=0; enough height segments to land vertices in
    // the measured slice.
    const trunk = new CylinderGeometry(0.5, 0.5, 10, 24, 40);
    trunk.translate(0, 5, 0);
    // A broad canopy well above the trunk slice must not widen the result.
    const canopy = new BoxGeometry(8, 2, 8);
    canopy.translate(0, 8, 0);
    const radius = trunkFootprintRadius([
      { geometry: trunk, height: 10 },
      { geometry: canopy, height: 10 },
    ]);
    expect(radius).toBeGreaterThan(0.48);
    expect(radius).toBeLessThan(0.55);
  });

  it('returns zero when no geometry is provided', () => {
    expect(trunkFootprintRadius([])).toBe(0);
  });
});
