import { create } from 'zustand';
import { ATMOSPHERE } from '@constants/atmosphere';

interface AtmosphereDebugState {
  active: boolean;
  hazeScale: number;
  windAmplitude: number;
  windSpeed: number;
  particleOpacity: number;
  particlesEnabled: boolean;
  windEnabled: boolean;
  paused: boolean;
  diagnostic: boolean;
  set: (values: Partial<Omit<AtmosphereDebugState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  active: false,
  hazeScale: 1,
  windAmplitude: ATMOSPHERE.wind.amplitude,
  windSpeed: ATMOSPHERE.wind.speed,
  particleOpacity: ATMOSPHERE.particles.opacity,
  particlesEnabled: true,
  windEnabled: true,
  paused: false,
  diagnostic: false,
};

export const useAtmosphereDebugStore = create<AtmosphereDebugState>((set) => ({
  ...DEFAULTS,
  set: (values) => set(values),
  reset: () => set((state) => ({ ...DEFAULTS, active: state.active })),
}));
