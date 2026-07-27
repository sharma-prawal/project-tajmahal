import { create } from 'zustand';

export const useBackMemoryWorldStore = create<{ returnActive: boolean; setReturnActive: (value: boolean) => void }>((set) => ({
  returnActive: false,
  setReturnActive: (returnActive) => set({ returnActive }),
}));
