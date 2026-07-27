import { useSunsetStore } from '@narrative/useSunsetStore';
import { useMemoryStore } from '@narrative/memory/useMemoryStore';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { getLastCheckpoint } from '@player/lastCheckpoint';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { SAVE_SCHEMA_VERSION, type SaveData } from './schema';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';

/** Shared by `useAutoSave` (periodic/memory-triggered writes) and `core/recovery` (save-before-interruption). */
export function buildSaveSnapshot(): Omit<SaveData, 'savedAt'> {
  const sunset = useSunsetStore.getState();
  const memory = useMemoryStore.getState();
  const accessibility = useAccessibilityStore.getState();
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    currentBeat: sunset.currentBeat,
    persistedStoryFloor: sunset.persistedStoryFloor,
    completedMemoryIds: memory.completedIds(),
    completedInteractionIds: interactionRuntime.getCompletedIds(),
    discoveredInteractionIds: interactionRuntime.getDiscoveredIds(),
    lastCheckpoint: getLastCheckpoint(),
    reducedMotion: accessibility.reducedMotion,
    audioMuted: accessibility.audioMuted,
    interactionDistanceScale: accessibility.interactionDistanceScale,
    highContrastPrompts: accessibility.highContrastPrompts,
    runtimeCompletedMemoryIds: memoryRuntime.getCompletedIds(),
    memoryFlags: memoryRuntime.getFlags(),
    activeMemoryCheckpoint: memoryRuntime.getCheckpoint(),
  };
}
