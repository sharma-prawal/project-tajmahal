import { AXIS_LAYOUT, GARDEN } from '@constants/world';
import { createSeededRandom, randomRange } from '@core/vegetation/random';

export interface AtmosphereParticleData {
  positions: Float32Array;
  phases: Float32Array;
  sizes: Float32Array;
}

export function createAtmosphereParticleData(count: number, seed = 5101): AtmosphereParticleData {
  const random = createSeededRandom(seed);
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const centerZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = randomRange(random, -GARDEN.usableWidth * 0.45, GARDEN.usableWidth * 0.45);
    positions[index * 3 + 1] = randomRange(random, 0.55, 5.2);
    positions[index * 3 + 2] = centerZ + randomRange(random, -GARDEN.axisLength * 0.48, GARDEN.axisLength * 0.48);
    phases[index] = randomRange(random, 0, Math.PI * 2);
    sizes[index] = randomRange(random, 0.55, 1.35);
  }
  return { positions, phases, sizes };
}
