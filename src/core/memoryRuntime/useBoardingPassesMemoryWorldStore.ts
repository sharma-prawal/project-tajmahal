import { create } from 'zustand';

export type BoardingPassesStage = 0 | 1 | 2 | 3;
interface BoardingPassesMemoryWorldState { stage: BoardingPassesStage; setStage: (stage: BoardingPassesStage) => void }
export const useBoardingPassesMemoryWorldStore = create<BoardingPassesMemoryWorldState>((set) => ({ stage: 0, setStage: (stage) => set({ stage }) }));
