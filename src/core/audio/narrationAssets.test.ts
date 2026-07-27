import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_DAY_CALL_MEMORY } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BACK_MEMORY } from '@core/memoryRuntime/backMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { LITTLE_DETAILS_MEMORY } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { MINTS_MEMORY } from '@core/memoryRuntime/mintsMemoryDefinition';
import type { RuntimeMemoryDefinition } from '@core/memoryRuntime/types';
import { UMBRELLA_MEMORY } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { NARRATION_ASSETS } from './audioAssets';

const MEMORIES: readonly RuntimeMemoryDefinition[] = [
  MINTS_MEMORY,
  BOARDING_PASSES_MEMORY,
  BACK_MEMORY,
  UMBRELLA_MEMORY,
  LITTLE_DETAILS_MEMORY,
  ALL_DAY_CALL_MEMORY,
  FRIDAY_NIGHT_MEMORY,
];

function publicFile(url: string): string {
  return `public${url}`;
}

describe('production narration assets', () => {
  it('provides a mastered voice file for every production dialogue beat', () => {
    const dialoguePaths = MEMORIES.flatMap((memory) => memory.steps
      .filter((step) => step.type === 'dialogue')
      .map((step) => NARRATION_ASSETS.memory(memory.id, step.id)));
    expect(dialoguePaths).toHaveLength(32);
    for (const path of dialoguePaths) {
      expect(existsSync(publicFile(path)), path).toBe(true);
      expect(statSync(publicFile(path)).size, path).toBeGreaterThan(4_000);
    }
  });

  it('includes device-specific tutorial narration and the complete streamed letter', () => {
    for (const scheme of ['desktop', 'touch'] as const) {
      for (let step = 1; step <= 3; step += 1) {
        const path = NARRATION_ASSETS.tutorial(scheme, step);
        expect(existsSync(publicFile(path)), path).toBe(true);
      }
    }
    expect(existsSync(publicFile(NARRATION_ASSETS.finalLetter))).toBe(true);
    expect(statSync(publicFile(NARRATION_ASSETS.finalLetter)).size).toBeGreaterThan(1_000_000);
  });
});
