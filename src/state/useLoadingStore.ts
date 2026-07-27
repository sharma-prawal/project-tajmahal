import { create } from 'zustand';

export type BootPhase = 'loading' | 'ready' | 'error';

interface LoadingState {
  phase: BootPhase;
  progress: number;
  error: string | null;
  /** Drei's global LoadingManager has gone idle (no in-flight assets). */
  assetsSettled: boolean;
  /** The lazy-loaded 3D experience chunk has mounted. */
  experienceMounted: boolean;
  setProgress: (progress: number) => void;
  setAssetsSettled: (settled: boolean) => void;
  setExperienceMounted: () => void;
  setError: (message: string) => void;
}

/**
 * Boot readiness is an AND of every task registered below, not just "no
 * assets currently in flight" — a lazy-loaded JS chunk finishing fetch is a
 * separate condition from Three's LoadingManager going idle, and both must
 * be true before the loading screen hands off. Add another boolean here
 * (and to the AND-check) if a future boot task needs to gate readiness too.
 */
export const useLoadingStore = create<LoadingState>((set, get) => {
  const checkReady = () => {
    const state = get();
    if (state.phase === 'error') return;
    if (state.assetsSettled && state.experienceMounted) {
      set({ phase: 'ready' });
    }
  };

  return {
    phase: 'loading',
    progress: 0,
    error: null,
    assetsSettled: false,
    experienceMounted: false,
    setProgress: (progress) => set({ progress }),
    setAssetsSettled: (assetsSettled) => {
      set({ assetsSettled });
      checkReady();
    },
    setExperienceMounted: () => {
      set({ experienceMounted: true });
      checkReady();
    },
    setError: (message) => set({ phase: 'error', error: message }),
  };
});
