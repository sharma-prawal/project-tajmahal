import { useEffect } from 'react';
import { useSunsetStore } from '@narrative/useSunsetStore';
import { useMemoryStore, deriveCompletedIds } from '@narrative/memory/useMemoryStore';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { hydrateLastCheckpoint } from '@player/lastCheckpoint';
import { saveManager } from './SaveManager';
import { buildSaveSnapshot } from './buildSnapshot';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';

const PERIODIC_SAVE_INTERVAL_MS = 5000;

/**
 * Loads and hydrates the versioned save on mount, then keeps it current:
 * an immediate write after every memory completion (Part 7's "immediate
 * write after memory completion"), and a debounced periodic write
 * otherwise. Mount once near the app root — works independent of whether
 * the 3D `Experience` chunk has loaded yet, since it only touches Zustand
 * stores and the checkpoint module, not the renderer.
 */
export function useAutoSave() {
  useEffect(() => {
    const data = saveManager.load();
    useSunsetStore.getState().hydrate(data.persistedStoryFloor);
    useSunsetStore.getState().setBeat(data.currentBeat);
    useMemoryStore.getState().restoreCompleted(data.completedMemoryIds);
    interactionRuntime.restore(data.completedInteractionIds, data.discoveredInteractionIds);
    memoryRuntime.restore(data.runtimeCompletedMemoryIds, data.memoryFlags, data.activeMemoryCheckpoint);
    hydrateLastCheckpoint(data.lastCheckpoint);
    useAccessibilityStore.getState().setReducedMotion(data.reducedMotion);
    useAccessibilityStore.getState().setAudioMuted(data.audioMuted);
    useAccessibilityStore.getState().setInteractionDistanceScale(data.interactionDistanceScale);
    useAccessibilityStore.getState().setHighContrastPrompts(data.highContrastPrompts);

    const unsubscribeMemory = useMemoryStore.subscribe((state, prevState) => {
      const before = deriveCompletedIds(prevState.phases).length;
      const after = deriveCompletedIds(state.phases).length;
      if (after !== before) {
        saveManager.saveNow(buildSaveSnapshot());
      }
    });
    const unsubscribeInteraction = interactionRuntime.subscribePersistence(() => {
      saveManager.saveNow(buildSaveSnapshot());
    });
    const unsubscribeRuntime = memoryRuntime.subscribePersistence(() => saveManager.saveNow(buildSaveSnapshot()));

    const interval = setInterval(() => {
      saveManager.saveDebounced(buildSaveSnapshot());
    }, PERIODIC_SAVE_INTERVAL_MS);

    return () => {
      unsubscribeMemory();
      unsubscribeInteraction();
      unsubscribeRuntime();
      clearInterval(interval);
    };
  }, []);
}
