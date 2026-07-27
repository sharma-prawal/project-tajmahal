import { useEffect } from 'react';
import { useSunsetStore } from '@narrative/useSunsetStore';
import { saveManager } from '@core/save/SaveManager';
import { buildSaveSnapshot } from '@core/save/buildSnapshot';

/**
 * Handles browser/tab/app backgrounding (Part 8): freezes `sunT` easing
 * (via `useSunsetStore.setFrozen`, which the sunset math already treats as
 * "no time passes") and saves immediately, so nothing drifts or is lost
 * while hidden. Audio suspend/resume is already handled by
 * `useAudioManager` (Phase 1); this hook is the sunset/save half.
 *
 * `visibilitychange` is the primary, reliable signal; `pagehide` covers
 * tab-close/navigation cases that don't always fire `visibilitychange` in
 * time to save; `blur`/`focus` is a softer secondary signal (e.g. switching
 * to devtools) that also pauses time-based easing without necessarily
 * forcing a save.
 */
export function useInterruptionRecovery() {
  useEffect(() => {
    const onVisibilityChange = () => {
      const hidden = document.hidden;
      useSunsetStore.getState().setFrozen(hidden);
      if (hidden) saveManager.saveNow(buildSaveSnapshot());
    };
    const onPageHide = () => saveManager.saveNow(buildSaveSnapshot());
    const onBlur = () => useSunsetStore.getState().setFrozen(true);
    const onFocus = () => {
      if (!document.hidden) useSunsetStore.getState().setFrozen(false);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
}
