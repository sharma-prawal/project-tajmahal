import { BEAT_ORDER, type BeatId } from '@constants/narrative';
import { MEMORY_IDS, type MemoryId } from '@narrative/memory/types';
import { isValidInteractionId } from '@core/interaction/validation';
import type { PersistedMemoryCheckpoint } from '@core/memoryRuntime/types';

export const SAVE_SCHEMA_VERSION = 3 as const;

export interface Checkpoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Versioned local save (docs/phase-2/12-production-order.md Part 12 item 7,
 * Part 7 of this prompt). Deliberately small — no analytics, no cloud save,
 * no personal letter/memory content (that's Phase 3+ narrative content, not
 * foundation state).
 */
export interface SaveDataV1 {
  schemaVersion: 1;
  currentBeat: BeatId;
  /** Highest sunT floor ever reached — restores the monotonic sunset without replaying it (Part 5). */
  persistedStoryFloor: number;
  completedMemoryIds: MemoryId[];
  /** Last known grounded position, used to restore a safe spawn on load. */
  lastCheckpoint: Checkpoint;
  reducedMotion: boolean;
  audioMuted: boolean;
  savedAt: string;
}

export interface SaveDataV2 extends Omit<SaveDataV1, 'schemaVersion'> {
  schemaVersion: 2;
  completedInteractionIds: string[];
  discoveredInteractionIds: string[];
  interactionDistanceScale: number;
  highContrastPrompts: boolean;
}

export interface SaveDataV3 extends Omit<SaveDataV2, 'schemaVersion'> {
  schemaVersion: 3;
  runtimeCompletedMemoryIds: string[];
  memoryFlags: string[];
  activeMemoryCheckpoint: PersistedMemoryCheckpoint | null;
}

export type SaveData = SaveDataV3;

export function createDefaultSave(): SaveDataV3 {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    currentBeat: 'loading',
    persistedStoryFloor: 0,
    completedMemoryIds: [],
    completedInteractionIds: [],
    discoveredInteractionIds: [],
    lastCheckpoint: { x: 0, y: 0.9, z: -3 },
    reducedMotion: false,
    audioMuted: false,
    interactionDistanceScale: 1,
    highContrastPrompts: false,
    runtimeCompletedMemoryIds: [],
    memoryFlags: [],
    activeMemoryCheckpoint: null,
    savedAt: new Date(0).toISOString(),
  };
}

function isCheckpoint(value: unknown): value is Checkpoint {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return typeof c.x === 'number' && typeof c.y === 'number' && typeof c.z === 'number';
}

/** Structural validation — used by the migration entry point to decide whether a stored blob is trustworthy. */
export function isValidSaveDataV1(value: unknown): value is SaveDataV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  if (v.schemaVersion !== 1) return false;
  if (typeof v.currentBeat !== 'string' || !BEAT_ORDER.includes(v.currentBeat as BeatId)) return false;
  if (typeof v.persistedStoryFloor !== 'number' || v.persistedStoryFloor < 0 || v.persistedStoryFloor > 1) return false;
  if (!Array.isArray(v.completedMemoryIds) || !v.completedMemoryIds.every((id) => MEMORY_IDS.includes(id as MemoryId))) {
    return false;
  }
  if (!isCheckpoint(v.lastCheckpoint)) return false;
  if (typeof v.reducedMotion !== 'boolean') return false;
  if (typeof v.audioMuted !== 'boolean') return false;
  if (typeof v.savedAt !== 'string') return false;

  return true;
}

export function isValidSaveDataV2(value: unknown): value is SaveDataV2 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 2) return false;
  const v1Shape = { ...v, schemaVersion: 1 };
  if (!isValidSaveDataV1(v1Shape)) return false;
  if (!Array.isArray(v.completedInteractionIds) || !v.completedInteractionIds.every(isValidInteractionId)) return false;
  if (!Array.isArray(v.discoveredInteractionIds) || !v.discoveredInteractionIds.every(isValidInteractionId)) return false;
  if (new Set(v.completedInteractionIds).size !== v.completedInteractionIds.length) return false;
  if (new Set(v.discoveredInteractionIds).size !== v.discoveredInteractionIds.length) return false;
  if (typeof v.interactionDistanceScale !== 'number' || v.interactionDistanceScale < 1 || v.interactionDistanceScale > 1.5) return false;
  if (typeof v.highContrastPrompts !== 'boolean') return false;
  return true;
}

function isStableRuntimeId(value: unknown): value is string { return isValidInteractionId(value); }
export function isValidSaveDataV3(value: unknown): value is SaveDataV3 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 3 || !isValidSaveDataV2({ ...v, schemaVersion: 2 })) return false;
  if (!Array.isArray(v.runtimeCompletedMemoryIds) || !v.runtimeCompletedMemoryIds.every(isStableRuntimeId) || new Set(v.runtimeCompletedMemoryIds).size !== v.runtimeCompletedMemoryIds.length) return false;
  if (!Array.isArray(v.memoryFlags) || !v.memoryFlags.every(isStableRuntimeId) || new Set(v.memoryFlags).size !== v.memoryFlags.length) return false;
  if (v.activeMemoryCheckpoint !== null) {
    if (!v.activeMemoryCheckpoint || typeof v.activeMemoryCheckpoint !== 'object') return false;
    const c = v.activeMemoryCheckpoint as Record<string, unknown>;
    if (!isStableRuntimeId(c.memoryId) || !Number.isInteger(c.contentVersion) || (c.contentVersion as number) < 1 || !isStableRuntimeId(c.stepId)) return false;
  }
  return true;
}
