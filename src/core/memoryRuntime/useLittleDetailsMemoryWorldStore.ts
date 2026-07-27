import { create } from 'zustand';

export type LittleDetailsStage = 0 | 1 | 2 | 3;
export const useLittleDetailsMemoryWorldStore = create<{ stage: LittleDetailsStage; setStage: (stage: LittleDetailsStage) => void }>((set) => ({ stage: 0, setStage: (stage) => set({ stage }) }));
