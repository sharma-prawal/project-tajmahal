import { describe, expect, it } from 'vitest';
import { COMPOSED_FLOWER_BED_BOUNDS } from './composition';
import {
  BED_LAYERS,
  type BedLayer,
  PLANT_SPECIES,
  PLANT_SPECIES_PROFILE,
  PLANTING_CLUMP_SIZE,
  bedLayerAt,
  createPlantBloomGeometry,
  createPlantFoliageGeometry,
} from './gardenPlanting';

describe('garden planting library', () => {
  it('gives every generated species a distinct silhouette and height', () => {
    const counts = PLANT_SPECIES.map((species) => createPlantFoliageGeometry(species).getAttribute('position').count);
    const heights = PLANT_SPECIES.map((species) => PLANT_SPECIES_PROFILE[species].height);
    expect(new Set(counts).size).toBe(PLANT_SPECIES.length);
    expect(new Set(heights).size).toBe(PLANT_SPECIES.length);
  });

  it('grows bloom geometry above its own foliage, and none for groundcover', () => {
    expect(createPlantBloomGeometry('groundcover')).toBeNull();
    for (const species of ['rosette', 'spike'] as const) {
      const bloom = createPlantBloomGeometry(species)!;
      const foliage = createPlantFoliageGeometry(species);
      foliage.computeBoundingBox();
      expect(bloom.boundingBox!.max.y).toBeGreaterThan(foliage.boundingBox!.max.y * 0.5);
    }
  });

  it('tints bloom petals from base to tip so instance colour still has depth', () => {
    const color = createPlantBloomGeometry('spike')!.getAttribute('color');
    const shades = Array.from({ length: color.count }, (_, i) => color.getX(i));
    expect(Math.min(...shades)).toBeGreaterThan(0.77);
    expect(Math.max(...shades)).toBeCloseTo(1, 5);
    expect(new Set(shades.map((s) => s.toFixed(3))).size).toBeGreaterThan(1);
  });

  it('plants in drifts rather than per-plant randomness', () => {
    // Two points inside the same clump, away from its edges, share a layer far
    // more often than not — the difference between a planting scheme and noise.
    let agreed = 0;
    for (let i = 0; i < 200; i += 1) {
      const x = -30 + i * 0.31;
      const z = -60 + i * 0.17;
      if (bedLayerAt(x, z, 3) === bedLayerAt(x + 0.05, z + 0.05, 3)) agreed += 1;
    }
    expect(agreed / 200).toBeGreaterThan(0.6);
  });

  it('uses every layer in every bed, so none is planted in a single species', () => {
    for (const [bedIndex, bounds] of COMPOSED_FLOWER_BED_BOUNDS.entries()) {
      const seen = new Set<BedLayer>();
      for (let x = bounds.minX; x < bounds.maxX; x += 0.85) {
        for (let z = bounds.minZ; z < bounds.maxZ; z += 0.85) seen.add(bedLayerAt(x, z, bedIndex));
      }
      expect(seen.size, `bed ${bedIndex}`).toBe(BED_LAYERS.length);
    }
  });

  // The garden lies entirely at negative X and Z, where JS `%` returns a
  // negative remainder — an unguarded modulo indexes off the pattern and the
  // plant silently never renders.
  it('resolves a real layer at negative world coordinates', () => {
    for (let x = -60; x <= 60; x += 1.1) {
      for (let z = -140; z <= -20; z += 3.7) {
        expect(BED_LAYERS).toContain(bedLayerAt(x, z, 5));
      }
    }
  });

  it('changes layer across a clump boundary', () => {
    const layers = new Set(
      Array.from({ length: 6 }, (_, i) => bedLayerAt(-20 + i * PLANTING_CLUMP_SIZE, -58, 1)),
    );
    expect(layers.size).toBeGreaterThan(1);
  });
});
