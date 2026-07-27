import { describe, expect, it } from 'vitest';
import { CANONICAL_JOURNEY, journeyBridgeStatus, validateCanonicalJourney } from './canonicalJourney';
import { BRIDGE_LOCATIONS, validateBridgeLocations } from './bridgeLocations';
import { MEMORY_MAPPING } from './memoryMapping';

describe('Phase 10F.1 — canonical journey', () => {
  it('has exactly seven unique production ids', () => {
    const ids = CANONICAL_JOURNEY.map((entry) => entry.productionMemoryId);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('has no duplicate canonical journey ids', () => {
    const ids = CANONICAL_JOURNEY.map((entry) => entry.canonicalJourneyId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses order 1-7 exactly once each, matching the approved sequence', () => {
    const byOrder = [...CANONICAL_JOURNEY].sort((a, b) => a.order - b.order);
    expect(byOrder.map((e) => e.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(byOrder.map((e) => e.productionMemoryId)).toEqual([
      'production.memory.mints',
      'production.memory.boarding-passes',
      'production.memory.little-details',
      'production.memory.back',
      'production.memory.umbrella',
      'production.memory.friday-night',
      'production.memory.all-day-call',
    ]);
  });

  it('runs no problems from validateCanonicalJourney', () => {
    expect(validateCanonicalJourney()).toEqual([]);
  });

  it('preserves the two proven mappings exactly, and nothing else', () => {
    const withSpatialId = CANONICAL_JOURNEY.filter((entry) => entry.spatialMemoryId !== null);
    expect(withSpatialId.map((e) => [e.productionMemoryId, e.spatialMemoryId])).toEqual([
      ['production.memory.back', 'm4'],
      ['production.memory.umbrella', 'm5'],
    ]);
  });

  it('never asserts a spatialMemoryId memoryMapping.ts has not proven', () => {
    for (const entry of CANONICAL_JOURNEY) {
      const row = MEMORY_MAPPING.find((r) => r.productionMemoryId === entry.productionMemoryId)!;
      if (entry.spatialMemoryId !== null) {
        expect(row.mappingStatus).toBe('proven');
        expect(row.spatialMemoryId).toBe(entry.spatialMemoryId);
      }
    }
  });

  it('never gates on a sequence prerequisite (Journey A: presentation/finale logic only)', () => {
    for (const entry of CANONICAL_JOURNEY) expect(entry.sequencePrerequisite).toBeNull();
  });

  it('gives the two proven beats no bridge, and every other beat exactly one', () => {
    for (const entry of CANONICAL_JOURNEY) {
      const isProven = entry.productionMemoryId === 'production.memory.back'
        || entry.productionMemoryId === 'production.memory.umbrella';
      if (isProven) {
        expect(journeyBridgeStatus(entry.productionMemoryId)).toBe('direct');
        expect(entry.bridgeLocationId).toBeNull();
      } else {
        expect(entry.bridgeLocationId).not.toBeNull();
        expect(['staged', 'pending']).toContain(journeyBridgeStatus(entry.productionMemoryId));
      }
    }
  });

  it('assigns m6 the pre-finale role and no narrative the culmination role except All-Day Call', () => {
    const preFinale = CANONICAL_JOURNEY.filter((e) => e.role === 'pre-finale');
    const culmination = CANONICAL_JOURNEY.filter((e) => e.role === 'culmination');
    expect(preFinale.map((e) => e.productionMemoryId)).toEqual(['production.memory.friday-night']);
    expect(culmination.map((e) => e.productionMemoryId)).toEqual(['production.memory.all-day-call']);
  });

  it('does not couple order to array index by accident (order is authored, re-sort proves it)', () => {
    const shuffled = [...CANONICAL_JOURNEY].reverse();
    const bySortedOrder = [...shuffled].sort((a, b) => a.order - b.order);
    expect(bySortedOrder).toEqual([...CANONICAL_JOURNEY].sort((a, b) => a.order - b.order));
  });
});

describe('Phase 10F.1 — bridge locations', () => {
  it('has one row per pending-placement journey entry, cross-referenced both ways', () => {
    expect(validateBridgeLocations()).toEqual([]);
    expect(BRIDGE_LOCATIONS).toHaveLength(5);
  });

  it('every bridge activation rule is unrestricted (no hard sequence locking introduced)', () => {
    for (const bridge of BRIDGE_LOCATIONS) expect(bridge.activationRule).toBe('unrestricted');
  });

  it('every bridge carries an evidence note, staged or not', () => {
    for (const bridge of BRIDGE_LOCATIONS) expect(bridge.evidenceNote.length).toBeGreaterThan(0);
  });

  it('references a valid production memory id for every bridge', () => {
    const validIds = new Set(CANONICAL_JOURNEY.map((e) => e.productionMemoryId));
    for (const bridge of BRIDGE_LOCATIONS) expect(validIds.has(bridge.productionMemoryId)).toBe(true);
  });
});
