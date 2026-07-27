import { create } from 'zustand';

export type AllDayCallStage = 0 | 1 | 2 | 3;
interface AllDayCallMemoryWorldState { stage: AllDayCallStage; setStage: (stage: AllDayCallStage) => void }
export const useAllDayCallMemoryWorldStore = create<AllDayCallMemoryWorldState>((set) => ({ stage: 0, setStage: (stage) => set({ stage }) }));
