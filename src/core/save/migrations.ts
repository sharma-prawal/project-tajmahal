import { isValidSaveDataV1, isValidSaveDataV2, isValidSaveDataV3, type SaveDataV3 } from './schema';

/**
 * Migration entry point. Only v1 exists today; a future schema bump adds a
 * branch here (e.g. `if (raw.schemaVersion === 1) return upgradeV1ToV2(raw)`)
 * rather than changing how callers read save data. Anything that doesn't
 * resolve to a valid, known version returns `null` — "invalid-save
 * recovery" means falling back to a fresh default save, never crashing.
 */
export function migrateSave(raw: unknown): SaveDataV3 | null {
  if (!raw || typeof raw !== 'object') return null;

  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (version === 1) {
    if (!isValidSaveDataV1(raw)) return null;
    const v2 = {
      ...raw,
      schemaVersion: 2,
      completedInteractionIds: [],
      discoveredInteractionIds: [],
      interactionDistanceScale: 1,
      highContrastPrompts: false,
    };
    return { ...v2, schemaVersion: 3, runtimeCompletedMemoryIds: [], memoryFlags: [], activeMemoryCheckpoint: null };
  }
  if (version === 2) return isValidSaveDataV2(raw) ? { ...raw, schemaVersion: 3, runtimeCompletedMemoryIds: [], memoryFlags: [], activeMemoryCheckpoint: null } : null;
  if (version === 3) return isValidSaveDataV3(raw) ? raw : null;

  return null;
}
