import { create } from 'zustand';

export const useUmbrellaMemoryWorldStore = create<{ pathActive: boolean; setPathActive: (value: boolean) => void }>((set) => ({
  pathActive: false,
  setPathActive: (pathActive) => set({ pathActive }),
}));
