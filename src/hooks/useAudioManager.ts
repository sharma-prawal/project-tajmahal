import { useEffect } from 'react';
import { audioManager } from '@core/audio/AudioManager';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useExperienceSettingsStore } from '@state/useExperienceSettingsStore';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { deriveCompletedIds, useMemoryStore } from '@narrative/memory/useMemoryStore';
import { useQualityProfile } from './useQualityProfile';

/** Central bridge between browser lifecycle/stores and the audio graph. */
export function useAudioManager() {
  const quality = useQualityProfile();

  useEffect(() => {
    audioManager.prepareForUnlock();
    const applySettings = () => {
      const settings = useExperienceSettingsStore.getState();
      audioManager.setVolumes({
        master: settings.audioMasterVolume,
        ambience: settings.audioAmbienceVolume,
        effects: settings.audioEffectsVolume,
        narration: settings.audioNarrationVolume,
      });
      audioManager.setMuted(useAccessibilityStore.getState().audioMuted);
    };
    const start = async () => {
      audioManager.init();
      applySettings();
      await audioManager.resume();
      // Some mobile browsers keep a first synthetic/indirect gesture locked.
      // Retain the unlock listeners until the context actually reports running
      // so the next genuine tap can retry instead of leaving silent gameplay.
      if (audioManager.inspectDiagnostics().lifecycle !== 'running') return;
      window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start); window.removeEventListener('touchend', start);
    };
    const onVisibilityChange = () => { if (document.hidden) void audioManager.suspend(); else void audioManager.resume(); };
    const onUnload = () => audioManager.dispose();
    let lastInteractionEvent = interactionRuntime.getEvents().at(-1);
    const unsubscribeInteraction = interactionRuntime.subscribe(() => {
      const events = interactionRuntime.getEvents();
      const previousIndex = lastInteractionEvent ? events.indexOf(lastInteractionEvent) : -1;
      const additions = events.slice(previousIndex + 1);
      for (const event of additions) {
        if (event.to === 'active' && !event.id?.startsWith('interaction.memory.')) {
          audioManager.playInteractionCue(event.id);
        }
      }
      lastInteractionEvent = events.at(-1);
    });
    let previousMemoryId = memoryRuntime.getSnapshot().activeMemoryId;
    const unsubscribeMemory = memoryRuntime.subscribe(() => {
      const nextId = memoryRuntime.getSnapshot().activeMemoryId;
      if (nextId !== previousMemoryId) audioManager.setMemoryActive(nextId !== null, nextId);
      previousMemoryId = nextId;
    });
    let completedSpatial = new Set(deriveCompletedIds(useMemoryStore.getState().phases));
    const unsubscribeChirags = useMemoryStore.subscribe((next) => {
      const completed = deriveCompletedIds(next.phases);
      if (completed.some((id) => !completedSpatial.has(id))) audioManager.playChiragIgnition();
      completedSpatial = new Set(completed);
    });
    const onPointerOver = (event: PointerEvent) => {
      const button = (event.target as Element | null)?.closest('button');
      if (!button || button.contains(event.relatedTarget as Node | null)) return;
      audioManager.playUiCue('hover');
    };
    const onUiClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('button')) audioManager.playUiCue('confirm');
    };
    const unsubscribeSettings = useExperienceSettingsStore.subscribe(applySettings);
    const unsubscribeAccessibility = useAccessibilityStore.subscribe(applySettings);

    window.addEventListener('pointerdown', start); window.addEventListener('keydown', start); window.addEventListener('touchend', start, { passive: true });
    document.addEventListener('pointerover', onPointerOver); document.addEventListener('click', onUiClick);
    document.addEventListener('visibilitychange', onVisibilityChange); window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start); window.removeEventListener('touchend', start);
      document.removeEventListener('pointerover', onPointerOver); document.removeEventListener('click', onUiClick);
      document.removeEventListener('visibilitychange', onVisibilityChange); window.removeEventListener('beforeunload', onUnload);
      unsubscribeInteraction(); unsubscribeMemory(); unsubscribeChirags(); unsubscribeSettings(); unsubscribeAccessibility(); audioManager.dispose();
    };
  }, []);

  useEffect(() => { audioManager.setQuality(quality.name); }, [quality.name]);
}
