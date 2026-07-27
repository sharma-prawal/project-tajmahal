import { create } from 'zustand';

interface AccessibilityState {
  /** Camera-comfort / reduced-motion baseline (Part 3) — dampens camera eases, particle motion. */
  reducedMotion: boolean;
  /** Audio consent/mute state (Part 7/8) — wired to AudioManager's master gain. */
  audioMuted: boolean;
  /** Multiplies authored interaction ranges without altering placement or focus-angle rules. */
  interactionDistanceScale: number;
  highContrastPrompts: boolean;
  setReducedMotion: (value: boolean) => void;
  setAudioMuted: (value: boolean) => void;
  setInteractionDistanceScale: (value: number) => void;
  setHighContrastPrompts: (value: boolean) => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Default reducedMotion is derived from the OS signal (Part 3); overridable via setReducedMotion and persisted by the save system. */
export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  reducedMotion: prefersReducedMotion(),
  audioMuted: false,
  interactionDistanceScale: 1,
  highContrastPrompts: false,
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setAudioMuted: (audioMuted) => set({ audioMuted }),
  setInteractionDistanceScale: (interactionDistanceScale) => set({ interactionDistanceScale: Math.min(1.5, Math.max(1, interactionDistanceScale)) }),
  setHighContrastPrompts: (highContrastPrompts) => set({ highContrastPrompts }),
}));
