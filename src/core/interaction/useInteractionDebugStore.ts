import { create } from 'zustand';

interface InteractionDebugState {
  active: boolean;
  showBounds: boolean;
  showFocusCones: boolean;
  revision: number;
  toggle: () => void;
  set: (patch: Partial<Pick<InteractionDebugState, 'active' | 'showBounds' | 'showFocusCones'>>) => void;
  bump: () => void;
}

export const useInteractionDebugStore = create<InteractionDebugState>((set) => ({
  active: false,
  showBounds: false,
  showFocusCones: false,
  revision: 0,
  toggle: () => set((state) => ({ active: !state.active })),
  set: (patch) => set(patch),
  bump: () => set((state) => ({ revision: state.revision + 1 })),
}));
