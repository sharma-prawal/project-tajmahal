import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MINTS_ANCHOR } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BOARDING_PASSES_ANCHOR } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { LITTLE_DETAILS_ANCHOR } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { FRIDAY_NIGHT_ANCHOR } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { ALL_DAY_CALL_ANCHOR } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BACK_ANCHOR } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_ANCHOR } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { REFERENCE_ANCHOR } from '@core/memoryRuntime/referenceMemoryDefinition';

/**
 * Phase 10F.2 — the capture scripts' spawn points must stay within reach of
 * the anchors they photograph.
 *
 * This exists because restaging four narratives silently broke thirteen
 * capture and benchmark scripts at once. Each spawns the player at a
 * hard-coded `?spawn=x,y,z` chosen to land inside a memory's activation
 * radius; when the anchors moved, every one of those points was suddenly
 * 25-100 m away, and the scripts would have hung waiting for a prompt that
 * could never appear. Nothing in the type system connects a string literal in
 * a script to a constant in `src/`, so nothing caught it.
 *
 * Reading the scripts as text is unusual, and deliberate: it is the only way
 * to tie the two together, because `tsx` cannot resolve this project's path
 * aliases at runtime and the scripts therefore cannot import these anchors.
 */
const ANCHORS: readonly (readonly [number, number, number])[] = [
  MINTS_ANCHOR,
  BOARDING_PASSES_ANCHOR,
  LITTLE_DETAILS_ANCHOR,
  FRIDAY_NIGHT_ANCHOR,
  ALL_DAY_CALL_ANCHOR,
  BACK_ANCHOR,
  UMBRELLA_ANCHOR,
  // The development fixture memory is a legitimate capture target too.
  REFERENCE_ANCHOR,
];

/**
 * The widest activation radius any production memory uses. A spawn point
 * within this of *some* anchor is a point that can plausibly trigger the
 * memory it was written for; one that is near none of them cannot.
 */
const MAX_ACTIVATION_RADIUS = 6.2;
/** Spawns are also used for approach and "not yet in range" framing shots. */
const APPROACH_ALLOWANCE = 14;

const SCRIPTS_DIR = path.resolve(__dirname, '../../../scripts');
const SPAWN_PATTERN = /spawn=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;

interface Spawn { file: string; x: number; y: number; z: number }

function collectSpawns(): Spawn[] {
  const spawns: Spawn[] = [];
  for (const file of readdirSync(SCRIPTS_DIR).filter((name) => name.endsWith('.ts'))) {
    const source = readFileSync(path.join(SCRIPTS_DIR, file), 'utf8');
    for (const match of source.matchAll(SPAWN_PATTERN)) {
      spawns.push({ file, x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) });
    }
  }
  return spawns;
}

describe('Phase 10F.2 — capture spawn points track the anchors', () => {
  const spawns = collectSpawns();

  it('finds literal spawn points to check', () => {
    expect(spawns.length).toBeGreaterThan(0);
  });

  /**
   * Only memory-capture scripts are held to this: the environment, lighting
   * and traversal captures legitimately spawn anywhere in the world.
   */
  it('keeps every memory-capture spawn within approach range of some anchor', () => {
    const memorySpawns = spawns.filter((spawn) => /memory|benchmark-memory/.test(spawn.file));
    expect(memorySpawns.length).toBeGreaterThan(0);
    for (const spawn of memorySpawns) {
      const nearest = Math.min(
        ...ANCHORS.map((anchor) => Math.hypot(spawn.x - anchor[0], spawn.z - anchor[2])),
      );
      expect(
        nearest,
        `${spawn.file}: spawn (${spawn.x}, ${spawn.z}) is ${nearest.toFixed(1)} m from the nearest anchor`,
      ).toBeLessThanOrEqual(MAX_ACTIVATION_RADIUS + APPROACH_ALLOWANCE);
    }
  });

  /**
   * A spawn must be above the ground it lands on. All-Day Call moved onto the
   * 3.2 m platform, where the previous `y=2` would have dropped the player
   * inside the slab.
   */
  it('spawns above the platform where the anchor is on it', () => {
    const platformSpawns = spawns.filter((spawn) => spawn.z <= -163);
    for (const spawn of platformSpawns) {
      expect(spawn.y, `${spawn.file}: spawn at z=${spawn.z} is inside the platform`).toBeGreaterThan(3.2);
    }
  });
});
