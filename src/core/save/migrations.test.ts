import { describe, expect, it } from 'vitest';
import { migrateSave } from './migrations';
import { createDefaultSave, type SaveDataV1 } from './schema';

const v1 = (): SaveDataV1 => ({ schemaVersion: 1, currentBeat: 'loading', persistedStoryFloor: 0, completedMemoryIds: ['m2'], lastCheckpoint: { x: 4, y: 2, z: -8 }, reducedMotion: true, audioMuted: true, savedAt: '2026-01-01T00:00:00.000Z' });

describe('migrateSave', () => {
  it('migrates a valid v1 save without discarding existing state', () => {
    const save = v1();
    expect(migrateSave(save)).toEqual({ ...save, schemaVersion: 3, completedInteractionIds: [], discoveredInteractionIds: [], interactionDistanceScale: 1, highContrastPrompts: false, runtimeCompletedMemoryIds: [], memoryFlags: [], activeMemoryCheckpoint: null });
  });

  it('passes through a valid v3 save unchanged', () => {
    const save = { ...createDefaultSave(), completedInteractionIds: ['garden.marker'] };
    expect(migrateSave(save)).toEqual(save);
  });
  it('migrates a valid Phase 6B v2 save with safe runtime defaults', () => {
    const old = { ...v1(), schemaVersion: 2 as const, completedInteractionIds: ['garden.marker'], discoveredInteractionIds: ['garden.marker'], interactionDistanceScale: 1, highContrastPrompts: true };
    expect(migrateSave(old)).toEqual({ ...old, schemaVersion: 3, runtimeCompletedMemoryIds: [], memoryFlags: [], activeMemoryCheckpoint: null });
  });

  it('returns null for null/undefined (no save yet)', () => {
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave(undefined)).toBeNull();
  });

  it('returns null for a non-object', () => {
    expect(migrateSave('garbage')).toBeNull();
    expect(migrateSave(42)).toBeNull();
  });

  it('returns null for an unknown schema version — invalid-save recovery, not a crash', () => {
    expect(migrateSave({ schemaVersion: 999 })).toBeNull();
  });

  it('returns null for a v1-tagged blob that fails structural validation (corrupt data)', () => {
    expect(migrateSave({ schemaVersion: 1, currentBeat: 'not-a-real-beat' })).toBeNull();
  });
});
