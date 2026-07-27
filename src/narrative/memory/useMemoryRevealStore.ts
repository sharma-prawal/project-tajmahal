import { create } from 'zustand';
import type { MemoryId } from './types';

/**
 * Phase 10D.1 — reveal progress, for the landmark's radial fill only.
 *
 * `MemoryVolume` already counts `revealElapsed` toward
 * `revealDurationSeconds`; it just never surfaced it, because a grey sphere had
 * nothing to do with the number. The landmark's inlay fills round as the
 * memory reveals, so it needs to see that progress.
 *
 * Deliberately **not** part of `useMemoryStore`: this is per-frame presentation
 * state, it is never saved, and it must never influence the state machine or
 * the door-unlock rule. Keeping it in its own store makes that structural
 * rather than a promise — nothing that persists or gates can read it, because
 * nothing that persists or gates imports it.
 *
 * Only one memory can be revealing at a time (the player is inside exactly one
 * discovery volume), so this holds a single slot rather than a map.
 */
interface MemoryRevealState {
  revealing: { memoryId: MemoryId; progress: number } | null;
  setRevealing: (memoryId: MemoryId, progress: number) => void;
  clearRevealing: (memoryId: MemoryId) => void;
}

export const useMemoryRevealStore = create<MemoryRevealState>((set, get) => ({
  revealing: null,
  setRevealing: (memoryId, progress) => {
    const current = get().revealing;
    // Quantised to ~2% so a 60 Hz reveal triggers ~50 React updates rather
    // than 300; the arc is rebuilt on every change and the difference is
    // invisible.
    const next = Math.round(Math.min(1, Math.max(0, progress)) * 50) / 50;
    if (current?.memoryId === memoryId && current.progress === next) return;
    set({ revealing: { memoryId, progress: next } });
  },
  clearRevealing: (memoryId) => {
    if (get().revealing?.memoryId !== memoryId) return;
    set({ revealing: null });
  },
}));
