import { create } from 'zustand';
export const useMintsMemoryWorldStore = create<{ acceptedVisible: boolean; setAcceptedVisible: (value: boolean) => void }>((set) => ({ acceptedVisible: false, setAcceptedVisible: (acceptedVisible) => set({ acceptedVisible }) }));
