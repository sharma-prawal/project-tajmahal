import { create } from 'zustand';

export type FridayNightStage = 0 | 1 | 2 | 3;
interface FridayNightMemoryWorldState { stage: FridayNightStage; setStage: (stage: FridayNightStage) => void }
export const useFridayNightMemoryWorldStore = create<FridayNightMemoryWorldState>((set) => ({ stage: 0, setStage: (stage) => set({ stage }) }));
