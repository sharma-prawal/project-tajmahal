import { describe, expect, it } from 'vitest';
import type { RuntimeMemoryDefinition } from './types';
import { MINTS_ANCHOR, MINTS_MEMORY } from './mintsMemoryDefinition';
import { UMBRELLA_ANCHOR, UMBRELLA_MEMORY } from './umbrellaMemoryDefinition';
import { LITTLE_DETAILS_ANCHOR, LITTLE_DETAILS_MEMORY } from './littleDetailsMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from './fridayNightMemoryDefinition';
import { ALL_DAY_CALL_CADENCE_BAR_SIZE } from './allDayCallMemoryDefinition';

function cameraStep(definition: RuntimeMemoryDefinition) {
  const step = definition.steps.find((candidate) => candidate.type === 'camera');
  if (!step || step.type !== 'camera') throw new Error(`${definition.id} has no camera step`);
  return step;
}

describe('Phase 11 final experience polish', () => {
  it('frames Mints from the clear side of its accent tree', () => {
    const camera = cameraStep(MINTS_MEMORY);
    expect(camera.position[0]).toBeGreaterThan(MINTS_ANCHOR[0]);
    expect(Math.hypot(camera.target[0] - MINTS_ANCHOR[0], camera.target[2] - MINTS_ANCHOR[2])).toBeLessThan(1);
  });

  it('keeps Umbrella local to its distinct pavilion prop instead of repeating the Back vista', () => {
    const camera = cameraStep(UMBRELLA_MEMORY);
    expect(Math.hypot(camera.target[0] - UMBRELLA_ANCHOR[0], camera.target[2] - UMBRELLA_ANCHOR[2])).toBeLessThan(5);
  });

  it('keeps Little Details focused on its pool-edge motif rather than spending the finale reveal', () => {
    const camera = cameraStep(LITTLE_DETAILS_MEMORY);
    expect(Math.hypot(camera.target[0] - LITTLE_DETAILS_ANCHOR[0], camera.target[2] - LITTLE_DETAILS_ANCHOR[2])).toBeLessThan(5);
    expect(camera.position[0]).toBeGreaterThan(LITTLE_DETAILS_ANCHOR[0]);
  });

  it('keeps the Friday Night enclosure readable from a low, restrained pitch', () => {
    const camera = cameraStep(FRIDAY_NIGHT_MEMORY);
    const horizontal = Math.hypot(camera.target[0] - camera.position[0], camera.target[2] - camera.position[2]);
    const downwardPitch = Math.atan2(camera.position[1] - camera.target[1], horizontal);
    expect(downwardPitch).toBeLessThan(0.35);
  });

  it('gives the All-Day Call cadence enough projected area to remain perceptible', () => {
    expect(ALL_DAY_CALL_CADENCE_BAR_SIZE[0]).toBeGreaterThanOrEqual(1.3);
    expect(ALL_DAY_CALL_CADENCE_BAR_SIZE[2]).toBeGreaterThanOrEqual(.28);
    expect(ALL_DAY_CALL_CADENCE_BAR_SIZE[1]).toBeLessThanOrEqual(.05);
  });
});
