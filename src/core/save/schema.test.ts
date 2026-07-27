import { describe, expect, it } from 'vitest';
import { createDefaultSave, isValidSaveDataV1, isValidSaveDataV2, isValidSaveDataV3, SAVE_SCHEMA_VERSION, type SaveDataV1, type SaveDataV2 } from './schema';

const v1 = (): SaveDataV1 => ({
  schemaVersion: 1, currentBeat: 'loading', persistedStoryFloor: 0, completedMemoryIds: [],
  lastCheckpoint: { x: 0, y: 2, z: -3 }, reducedMotion: false, audioMuted: false,
  savedAt: new Date(0).toISOString(),
});
const v2 = (): SaveDataV2 => ({ ...v1(), schemaVersion: 2, completedInteractionIds: [], discoveredInteractionIds: [], interactionDistanceScale: 1, highContrastPrompts: false });

describe('createDefaultSave', () => {
  it('produces a structurally valid save', () => {
    const save = createDefaultSave();
    expect(isValidSaveDataV3(save)).toBe(true);
    expect(save.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(save.completedMemoryIds).toEqual([]);
    expect(save.persistedStoryFloor).toBe(0);
  });
});

describe('isValidSaveDataV1', () => {
  it('rejects null/undefined/non-object', () => {
    expect(isValidSaveDataV1(null)).toBe(false);
    expect(isValidSaveDataV1(undefined)).toBe(false);
    expect(isValidSaveDataV1('a string')).toBe(false);
    expect(isValidSaveDataV1(42)).toBe(false);
  });

  it('rejects a wrong schema version', () => {
    const save = { ...v1(), schemaVersion: 99 };
    expect(isValidSaveDataV1(save)).toBe(false);
  });

  it('rejects an unknown beat', () => {
    const save = { ...v1(), currentBeat: 'not-a-beat' };
    expect(isValidSaveDataV1(save)).toBe(false);
  });

  it('rejects an out-of-range persistedStoryFloor', () => {
    expect(isValidSaveDataV1({ ...v1(), persistedStoryFloor: 1.5 })).toBe(false);
    expect(isValidSaveDataV1({ ...v1(), persistedStoryFloor: -0.1 })).toBe(false);
  });

  it('rejects unknown memory ids in completedMemoryIds', () => {
    const save = { ...v1(), completedMemoryIds: ['m1', 'not-a-memory'] };
    expect(isValidSaveDataV1(save)).toBe(false);
  });

  it('rejects a malformed checkpoint', () => {
    expect(isValidSaveDataV1({ ...v1(), lastCheckpoint: { x: 0 } })).toBe(false);
    expect(isValidSaveDataV1({ ...v1(), lastCheckpoint: null })).toBe(false);
  });

  it('accepts a fully valid save with completed memories', () => {
    const save = { ...v1(), completedMemoryIds: ['m1', 'm3', 'm6'] };
    expect(isValidSaveDataV1(save)).toBe(true);
  });
});

describe('isValidSaveDataV2', () => {
  it('accepts stable persisted interaction ids', () => {
    expect(isValidSaveDataV2({ ...v2(), completedInteractionIds: ['garden.marker-1'] })).toBe(true);
  });
  it('rejects malformed or duplicate persisted interaction ids', () => {
    expect(isValidSaveDataV2({ ...v2(), completedInteractionIds: ['bad id'] })).toBe(false);
    expect(isValidSaveDataV2({ ...v2(), completedInteractionIds: ['marker.one', 'marker.one'] })).toBe(false);
  });
});

describe('isValidSaveDataV3', () => {
  it('accepts a runtime checkpoint and rejects malformed versions', () => {
    expect(isValidSaveDataV3({ ...createDefaultSave(), activeMemoryCheckpoint: { memoryId: 'dev.memory', contentVersion: 1, stepId: 'safe-return' } })).toBe(true);
    expect(isValidSaveDataV3({ ...createDefaultSave(), activeMemoryCheckpoint: { memoryId: 'dev.memory', contentVersion: 0, stepId: 'safe-return' } })).toBe(false);
  });
});
