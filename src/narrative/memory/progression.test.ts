import { describe, expect, it } from 'vitest';
import { MEMORY_DEFINITIONS, DOOR_UNLOCK_THRESHOLD } from './definitions';
import {
  canAlwaysReachThreshold,
  isFinalMemoryUnlocked,
  isDoorUnlocked,
  nearestIncompleteMemory,
  requiredOptionalCount,
} from './progression';

describe('isDoorUnlocked', () => {
  it('is false below the threshold', () => {
    expect(isDoorUnlocked(6, DOOR_UNLOCK_THRESHOLD)).toBe(false);
  });
  it('is true at or above the threshold', () => {
    expect(isDoorUnlocked(7, DOOR_UNLOCK_THRESHOLD)).toBe(true);
    expect(isDoorUnlocked(8, DOOR_UNLOCK_THRESHOLD)).toBe(true);
  });
});

describe('memory-gate deadlock guarantee', () => {
  it('has exactly three unmissable memories and four optional (matches Part 4 design)', () => {
    const unmissable = MEMORY_DEFINITIONS.filter((d) => d.classification === 'unmissable');
    const optional = MEMORY_DEFINITIONS.filter((d) => d.classification === 'optional');
    expect(unmissable.length).toBe(3);
    expect(optional.length).toBe(4);
  });

  it('the door is always reachable: unmissable + optional pool is large enough for the threshold', () => {
    expect(canAlwaysReachThreshold(MEMORY_DEFINITIONS, DOOR_UNLOCK_THRESHOLD)).toBe(true);
  });

  it('requires the complete seven-memory journey for the mausoleum door', () => {
    expect(requiredOptionalCount(MEMORY_DEFINITIONS, DOOR_UNLOCK_THRESHOLD)).toBe(4);
  });

  it('completing all unmissable and all optional memories reaches the threshold', () => {
    const unmissableIds = MEMORY_DEFINITIONS.filter((d) => d.classification === 'unmissable').map((d) => d.id);
    const optionalIds = MEMORY_DEFINITIONS.filter((d) => d.classification === 'optional').map((d) => d.id);
    expect(isDoorUnlocked([...unmissableIds, ...optionalIds].length, DOOR_UNLOCK_THRESHOLD)).toBe(true);
  });

  it('completing all 3 unmissable + only 1 optional does NOT reach the threshold', () => {
    const unmissableIds = MEMORY_DEFINITIONS.filter((d) => d.classification === 'unmissable').map((d) => d.id);
    const completed = [...unmissableIds, 'm1'];
    expect(isDoorUnlocked(completed.length, DOOR_UNLOCK_THRESHOLD)).toBe(false);
  });
});

describe('final Taj memory gate', () => {
  it('keeps m7 asleep until m1 through m6 are complete', () => {
    expect(isFinalMemoryUnlocked(['m1', 'm2', 'm3', 'm4', 'm5'])).toBe(false);
    expect(isFinalMemoryUnlocked(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'])).toBe(true);
  });

  it('does not let m7 substitute for a missing garden memory', () => {
    expect(isFinalMemoryUnlocked(['m1', 'm2', 'm3', 'm4', 'm5', 'm7'])).toBe(false);
  });
});

describe('nearestIncompleteMemory', () => {
  it('returns the closest definition to a given position', () => {
    const closest = nearestIncompleteMemory(MEMORY_DEFINITIONS, [], MEMORY_DEFINITIONS[0].location);
    expect(closest?.id).toBe(MEMORY_DEFINITIONS[0].id);
  });

  it('excludes completed memories', () => {
    const first = MEMORY_DEFINITIONS[0];
    const closest = nearestIncompleteMemory(MEMORY_DEFINITIONS, [first.id], first.location);
    expect(closest?.id).not.toBe(first.id);
  });

  it('returns null when everything is complete', () => {
    const allIds = MEMORY_DEFINITIONS.map((d) => d.id);
    const closest = nearestIncompleteMemory(MEMORY_DEFINITIONS, allIds, { x: 0, y: 0, z: 0 });
    expect(closest).toBeNull();
  });
});
