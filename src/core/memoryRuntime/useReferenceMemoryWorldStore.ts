import { create } from 'zustand';
export const useReferenceMemoryWorldStore = create<{ guideVisible: boolean; setGuideVisible: (value: boolean) => void }>((set) => ({ guideVisible: false, setGuideVisible: (guideVisible) => set({ guideVisible }) }));
