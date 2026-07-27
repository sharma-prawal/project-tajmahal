import { AXIS_LAYOUT, GARDEN } from '@constants/world';
import { AMBIENT_LIFE, type AmbientFamily } from '@constants/ambientLife';
import { createSeededRandom, randomRange } from '@core/vegetation/random';
import { COMPOSED_ACCENT_TREES, COMPOSED_FLOWER_BED_BOUNDS } from '@core/vegetation/composition';

export const AMBIENT_FAMILY_ID: Record<AmbientFamily, number> = {
  birds: 0,
  butterflies: 1,
  petals: 2,
  leaves: 3,
  mist: 4,
};

export interface AmbientLifeData {
  positions: Float32Array;
  phases: Float32Array;
  sizes: Float32Array;
  families: Float32Array;
  ranks: Float32Array;
}

const FAMILY_ORDER: AmbientFamily[] = ['birds', 'butterflies', 'petals', 'leaves', 'mist'];
const gardenCenterZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const fountainZ = [
  AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.25,
  AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.75,
];

export function createAmbientLifeData(seed: number = AMBIENT_LIFE.seed): AmbientLifeData {
  const random = createSeededRandom(seed);
  const total = Object.values(AMBIENT_LIFE.counts).reduce((sum, count) => sum + count, 0);
  const positions = new Float32Array(total * 3);
  const phases = new Float32Array(total);
  const sizes = new Float32Array(total);
  const families = new Float32Array(total);
  const ranks = new Float32Array(total);
  let cursor = 0;

  const add = (family: AmbientFamily, count: number) => {
    for (let index = 0; index < count; index += 1) {
      let x = 0; let y = 0; let z = 0; let size = 1;
      if (family === 'birds') {
        x = randomRange(random, -58, 58); y = randomRange(random, 18, 29); z = randomRange(random, AXIS_LAYOUT.gardenEnd - 22, AXIS_LAYOUT.gardenStart + 8); size = randomRange(random, 0.85, 1.2);
      } else if (family === 'butterflies') {
        // Phase 10B: butterflies belong over the *flowers*. They used to hover
        // in one clump beside the pool, which read as an effect placed near the
        // camera rather than as garden life; they now work the planted beds.
        const bed = COMPOSED_FLOWER_BED_BOUNDS[index % COMPOSED_FLOWER_BED_BOUNDS.length];
        x = randomRange(random, bed.minX, bed.maxX); y = randomRange(random, 0.5, 1.3); z = randomRange(random, bed.minZ, bed.maxZ); size = randomRange(random, 0.75, 1.15);
      } else if (family === 'mist') {
        const basin = index % fountainZ.length;
        x = randomRange(random, -0.72, 0.72); y = randomRange(random, 0.3, 1.15); z = fountainZ[basin] + randomRange(random, -0.72, 0.72); size = randomRange(random, 0.7, 1.25);
      } else if (family === 'petals') {
        // Phase 10B: petals fall under the accent trees, not over open lawn.
        const grove = COMPOSED_ACCENT_TREES[index % COMPOSED_ACCENT_TREES.length];
        x = grove.position[0] + randomRange(random, -grove.canopyRadius, grove.canopyRadius);
        y = randomRange(random, 1.2, 4.6);
        z = grove.position[1] + randomRange(random, -grove.canopyRadius, grove.canopyRadius);
        size = randomRange(random, 0.65, 1.05);
      } else {
        x = randomRange(random, -34, -14); y = randomRange(random, 1.4, 5.2); z = randomRange(random, gardenCenterZ - 42, gardenCenterZ - 18); size = randomRange(random, 0.65, 1.05);
      }
      positions[cursor * 3] = x;
      positions[cursor * 3 + 1] = y;
      positions[cursor * 3 + 2] = z;
      phases[cursor] = randomRange(random, 0, Math.PI * 2);
      sizes[cursor] = size;
      families[cursor] = AMBIENT_FAMILY_ID[family];
      ranks[cursor] = (index + 0.5) / count;
      cursor += 1;
    }
  };

  for (const family of FAMILY_ORDER) add(family, AMBIENT_LIFE.counts[family]);
  return { positions, phases, sizes, families, ranks };
}

export const AMBIENT_LIFE_BOUNDS = {
  minX: -58, maxX: 58, minY: 0.3, maxY: 29,
  minZ: AXIS_LAYOUT.gardenEnd - 22, maxZ: AXIS_LAYOUT.gardenStart + 8,
  gardenCenterZ,
} as const;
