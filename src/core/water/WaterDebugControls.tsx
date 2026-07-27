import { useEffect } from 'react';
import { env } from '@config/env';
import { useWaterDebugStore } from './useWaterDebugStore';

export function WaterDebugControls() {
  useEffect(() => {
    if (!env.enableDebugTools) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'KeyU' || event.repeat) return;
      const state = useWaterDebugStore.getState();
      state.set({ active: !state.active });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
