import { create } from 'zustand';
import { BEAT_ORDER, type BeatId } from '@constants/narrative';
import { beatFloor, clampSunT, computeSunT } from './sunsetMath';

/** Dev-tunable: seconds to ease from the current beat's floor toward the next beat's floor while dwelling in a beat. Content authoring will replace this with authored per-beat transitions later. */
const EASE_DURATION_SECONDS = 8;

interface SunsetState {
  /** Highest sunT floor ever reached this run — the monotonic backtracking guard. Persisted (Part 7). */
  persistedStoryFloor: number;
  currentBeat: BeatId;
  /** 0..1 eased progress within the current beat, toward the next beat's floor. */
  localT: number;
  /** True while the tab is hidden/backgrounded or the experience is paused — freezes easing (Part 5/11). */
  frozen: boolean;
  /** Derived: computeSunT(persistedStoryFloor, beatFloor(currentBeat), eased local progress). */
  sunT: number;
  setBeat: (beat: BeatId) => void;
  tick: (deltaSeconds: number) => void;
  setFrozen: (frozen: boolean) => void;
  /** Called by the save system on load — never lowers persistedStoryFloor. */
  hydrate: (persistedStoryFloor: number) => void;
  reset: () => void;
}

function nextBeatFloor(beat: BeatId): number {
  const idx = BEAT_ORDER.indexOf(beat);
  const next = BEAT_ORDER[idx + 1];
  return next ? beatFloor(next) : beatFloor(beat);
}

function deriveSunT(state: Pick<SunsetState, 'persistedStoryFloor' | 'currentBeat' | 'localT'>): number {
  const floor = beatFloor(state.currentBeat);
  const next = nextBeatFloor(state.currentBeat);
  const eased = floor + (next - floor) * state.localT;
  return clampSunT(computeSunT(state.persistedStoryFloor, floor, eased));
}

export const useSunsetStore = create<SunsetState>((set, get) => ({
  persistedStoryFloor: 0,
  currentBeat: 'loading',
  localT: 0,
  frozen: false,
  sunT: 0,
  setBeat: (beat) => {
    set((state) => {
      const persistedStoryFloor = Math.max(state.persistedStoryFloor, beatFloor(beat));
      const next = { ...state, currentBeat: beat, localT: 0, persistedStoryFloor };
      return { ...next, sunT: deriveSunT(next) };
    });
  },
  tick: (deltaSeconds) => {
    const state = get();
    if (state.frozen) return;
    const localT = Math.min(1, state.localT + deltaSeconds / EASE_DURATION_SECONDS);
    const next = { ...state, localT };
    set({ localT, sunT: deriveSunT(next) });
  },
  setFrozen: (frozen) => set({ frozen }),
  hydrate: (persistedStoryFloor) => {
    set((state) => {
      const merged = { ...state, persistedStoryFloor: Math.max(state.persistedStoryFloor, persistedStoryFloor) };
      return { ...merged, sunT: deriveSunT(merged) };
    });
  },
  reset: () => set({ persistedStoryFloor: 0, currentBeat: 'loading', localT: 0, frozen: false, sunT: 0 }),
}));
