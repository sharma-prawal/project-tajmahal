import { create } from 'zustand';
import { AMBIENT_LIFE, type AmbientFamily } from '@constants/ambientLife';

interface AmbientLifeDebugState extends Record<AmbientFamily, boolean> {
  active: boolean;
  paused: boolean;
  diagnostic: boolean;
  density: number;
  speed: number;
  opacity: number;
  set: (values: Partial<Omit<AmbientLifeDebugState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  active: false, paused: false, diagnostic: false, density: 1,
  speed: AMBIENT_LIFE.speed, opacity: AMBIENT_LIFE.opacity,
  birds: true, butterflies: true, petals: true, leaves: true, mist: true,
};

export const useAmbientLifeDebugStore = create<AmbientLifeDebugState>((set) => ({
  ...DEFAULTS,
  set: (values) => set(values),
  reset: () => set((state) => ({ ...DEFAULTS, active: state.active })),
}));
