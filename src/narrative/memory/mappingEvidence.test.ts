import { describe, expect, it } from 'vitest';
import { MINTS_ANCHOR } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BACK_ANCHOR } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_ANCHOR } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { LITTLE_DETAILS_ANCHOR } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_ANCHOR } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BOARDING_PASSES_ANCHOR } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_ANCHOR } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { MEMORY_DEFINITIONS } from './definitions';
import { MEMORY_MAPPING } from './memoryMapping';
import { BRIDGE_LOCATIONS } from './bridgeLocations';

/**
 * Phase 10E.2 — the structural facts the mapping analysis rested on.
 *
 * **These are historical measurements, and they are still the reason the two
 * id spaces were never merged.** Phase 10F.2 restaged four of the seven
 * narratives to express the approved canonical journey, so the anchors this
 * file originally read from `*MemoryDefinition.ts` have moved. The evidence
 * did not move: it was a measurement of where Phase 7 put things, and it is
 * preserved below as explicit literals so the argument stays executable
 * instead of decaying into a claim in an old document.
 *
 * Why keep it at all? Because the 10E.2 conclusion — that no historical
 * mapping exists between System A's seven places and System B's seven
 * narratives — is what makes a *bridge* the honest construct. If someone
 * later reads `bridgeLocations.ts` and wonders why Mints is merely "staged
 * near m1" rather than "is m1", this is the answer, with numbers.
 *
 * The second half of the file checks the present: that restaging moved the
 * anchors exactly where the bridges say, and that it created no new identity
 * claims.
 */
const PHASE_7_ANCHORS = {
  back: [-25.7, 0, -141.5],
  umbrella: [25.7, 0, -141.5],
  mints: [12, 0.22, -74],
  'all-day-call': [51, 0.02, -72],
  'boarding-passes': [-51, 0.02, -72],
  'little-details': [-20, 0.035, -126],
  'friday-night': [20, 0.03, -126],
} as const satisfies Record<string, readonly [number, number, number]>;

const spine = (id: string) => MEMORY_DEFINITIONS.find((definition) => definition.id === id)!;
const horizontal = (anchor: readonly [number, number, number], id: string) =>
  Math.hypot(anchor[0] - spine(id).location.x, anchor[2] - spine(id).location.z);
const containedIn = (anchor: readonly [number, number, number]) =>
  MEMORY_DEFINITIONS.filter((d) => Math.hypot(anchor[0] - d.location.x, anchor[2] - d.location.z) <= d.discoveryRadius)
    .map((d) => d.id);

describe('Phase 10E.2 — mapping evidence (measured at the Phase 7 anchors)', () => {
  describe('containment: which narratives fell inside which volumes', () => {
    it('confirms the two proven pavilion pairings are uniquely contained', () => {
      expect(containedIn(PHASE_7_ANCHORS.back)).toEqual(['m4']);
      expect(containedIn(PHASE_7_ANCHORS.umbrella)).toEqual(['m5']);
      expect(horizontal(PHASE_7_ANCHORS.back, 'm4')).toBeCloseTo(0, 1);
      expect(horizontal(PHASE_7_ANCHORS.umbrella, 'm5')).toBeCloseTo(0, 1);
    });

    it('confirms two narratives contested m3 at an exact tie', () => {
      expect(containedIn(PHASE_7_ANCHORS['little-details'])).toEqual(['m3']);
      expect(containedIn(PHASE_7_ANCHORS['friday-night'])).toEqual(['m3']);
      // The tie is what made this unresolvable by geometry — and why Journey A
      // had to resolve it as authorship instead.
      expect(horizontal(PHASE_7_ANCHORS['little-details'], 'm3'))
        .toBeCloseTo(horizontal(PHASE_7_ANCHORS['friday-night'], 'm3'), 5);
    });

    it('confirms three narratives fell inside no volume at all', () => {
      for (const key of ['mints', 'all-day-call', 'boarding-passes'] as const) {
        expect(containedIn(PHASE_7_ANCHORS[key]), `${key} should be contained by nothing`).toEqual([]);
      }
    });

    it('confirms m1, m6 and m7 contained no narrative', () => {
      const allContained = Object.values(PHASE_7_ANCHORS).flatMap(containedIn);
      for (const id of ['m1', 'm6', 'm7']) expect(allContained).not.toContain(id);
    });
  });

  /**
   * The structural argument against mapping the perimeter pair onto the
   * quadrant pair: they were different *shapes* of relationship.
   */
  describe('mirror structure', () => {
    it('confirms the perimeter narratives were an exact east/west mirrored pair', () => {
      expect(PHASE_7_ANCHORS['all-day-call'][0]).toBeCloseTo(-PHASE_7_ANCHORS['boarding-passes'][0], 5);
      expect(PHASE_7_ANCHORS['all-day-call'][2]).toBeCloseTo(PHASE_7_ANCHORS['boarding-passes'][2], 5);
    });

    it('confirms the pool narratives were an exact east/west mirrored pair', () => {
      expect(PHASE_7_ANCHORS['little-details'][0]).toBeCloseTo(-PHASE_7_ANCHORS['friday-night'][0], 5);
      expect(PHASE_7_ANCHORS['little-details'][2]).toBeCloseTo(PHASE_7_ANCHORS['friday-night'][2], 5);
    });

    it('confirms m1 and m2 are NOT a mirrored pair — both sit west of the axis', () => {
      expect(spine('m1').location.x).toBeLessThan(0);
      expect(spine('m2').location.x).toBeLessThan(0);
      expect(spine('m1').location.x).toBeCloseTo(spine('m2').location.x, 5);
      // They differ in depth, not side: a north/south pair, not east/west.
      expect(Math.abs(spine('m1').location.z - spine('m2').location.z)).toBeGreaterThan(30);
    });

    it('confirms the spine has no mid-garden volume east of the axis', () => {
      const midGarden = MEMORY_DEFINITIONS.filter((d) => d.location.z > -110 && d.location.z < -40);
      expect(midGarden.map((d) => d.id)).toEqual(['m1', 'm2']);
      expect(midGarden.every((d) => d.location.x < 0)).toBe(true);
    });
  });

  describe('distances quoted in the approval packet', () => {
    it.each([
      ['mints', 'm1', 42.6],
      ['boarding-passes', 'm1', 30.4],
      ['all-day-call', 'm5', 74.0],
      ['little-details', 'm3', 20.0],
      ['friday-night', 'm3', 20.0],
    ] as const)('%s was %s m from %s', (key, id, expected) => {
      expect(horizontal(PHASE_7_ANCHORS[key], id)).toBeCloseTo(expected, 1);
    });
  });
});

describe('Phase 10F.2 — what restaging did and did not change', () => {
  const CURRENT: Record<string, readonly [number, number, number]> = {
    'production.memory.mints': MINTS_ANCHOR,
    'production.memory.boarding-passes': BOARDING_PASSES_ANCHOR,
    'production.memory.little-details': LITTLE_DETAILS_ANCHOR,
    'production.memory.friday-night': FRIDAY_NIGHT_ANCHOR,
    'production.memory.all-day-call': ALL_DAY_CALL_ANCHOR,
  };

  it('left the two proven anchors exactly where the evidence found them', () => {
    expect(BACK_ANCHOR).toEqual(PHASE_7_ANCHORS.back);
    expect(UMBRELLA_ANCHOR).toEqual(PHASE_7_ANCHORS.umbrella);
  });

  it('moved exactly the restaged anchors (spread pass added Little Details), and no others', () => {
    const moved = Object.entries(CURRENT)
      .filter(([id]) => {
        const key = id.replace('production.memory.', '') as keyof typeof PHASE_7_ANCHORS;
        return CURRENT[id].some((value, axis) => value !== PHASE_7_ANCHORS[key][axis]);
      })
      .map(([id]) => id)
      .sort();
    expect(moved).toEqual([
      'production.memory.all-day-call',
      'production.memory.boarding-passes',
      'production.memory.friday-night',
      'production.memory.little-details',
      'production.memory.mints',
    ]);
  });

  it('moved each anchor to exactly its staged bridge position', () => {
    for (const bridge of BRIDGE_LOCATIONS) {
      if (bridge.status !== 'staged') continue;
      expect(CURRENT[bridge.productionMemoryId], bridge.id).toEqual(bridge.position);
    }
  });

  /**
   * The load-bearing invariant of the whole 10E/10F effort: **staging a
   * narrative near a region is not the same as claiming it is that region.**
   * Restaging moved props and cameras; it must not have produced a single new
   * identity claim, or the bridges have quietly become the mapping that the
   * evidence says does not exist.
   */
  it('created no new spatial identity — still exactly two proven mappings', () => {
    const proven = MEMORY_MAPPING.filter((row) => row.mappingStatus === 'proven');
    expect(proven.map((row) => row.spatialMemoryId)).toEqual(['m4', 'm5']);
    const unmapped = MEMORY_MAPPING.filter((row) => row.mappingStatus !== 'proven');
    expect(unmapped).toHaveLength(5);
    for (const row of unmapped) expect(row.spatialMemoryId).toBeNull();
  });

  it('does not invent a spine mapping for the west-garden Friday staging', () => {
    expect(containedIn(FRIDAY_NIGHT_ANCHOR)).not.toContain('m6');
    const fridayRow = MEMORY_MAPPING.find((row) => row.productionMemoryId === 'production.memory.friday-night')!;
    expect(fridayRow.spatialMemoryId).toBeNull();
  });
});
