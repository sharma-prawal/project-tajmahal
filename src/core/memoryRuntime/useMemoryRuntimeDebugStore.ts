import { create } from 'zustand';
export const useMemoryRuntimeDebugStore = create<{ active: boolean; revision: number; toggle: () => void; bump: () => void }>((set) => ({ active: false, revision: 0, toggle: () => set((state) => ({ active: !state.active })), bump: () => set((state) => ({ revision: state.revision + 1 })) }));
