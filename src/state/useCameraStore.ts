import { create } from 'zustand';
import type { CameraMode } from '@/types/camera';

interface CameraState {
  mode: CameraMode;
  setMode: (mode: CameraMode) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  mode: 'exploration',
  setMode: (mode) => set({ mode }),
}));
