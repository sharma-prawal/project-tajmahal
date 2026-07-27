import { create } from 'zustand';
import { WATER, type WaterReflectionMode } from '@constants/water';

interface WaterDebugState {
  active: boolean;
  reflectionMode: WaterReflectionMode;
  waveAmplitude: number;
  waveSpeed: number;
  reflectionIntensity: number;
  specularIntensity: number;
  depthColor: string;
  rippleScale: number;
  paused: boolean;
  set: (values: Partial<Omit<WaterDebugState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  active: false,
  reflectionMode: 'auto' as WaterReflectionMode,
  waveAmplitude: WATER.waveAmplitude,
  waveSpeed: WATER.waveSpeed,
  reflectionIntensity: WATER.reflectionIntensity,
  specularIntensity: WATER.specularIntensity,
  depthColor: WATER.deepColor,
  rippleScale: WATER.rippleScale,
  paused: false,
};

export const useWaterDebugStore = create<WaterDebugState>((set) => ({
  ...DEFAULTS,
  set: (values) => set(values),
  reset: () => set(DEFAULTS),
}));
