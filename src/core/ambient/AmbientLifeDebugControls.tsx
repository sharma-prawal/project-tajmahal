import { useEffect } from 'react';
import { env } from '@config/env';
import { useAmbientLifeDebugStore } from './useAmbientLifeDebugStore';

export function AmbientLifeDebugControls() {
  useEffect(() => {
    if (!env.enableDebugTools) return undefined;
    const keydown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyO' || event.repeat) return;
      const state = useAmbientLifeDebugStore.getState();
      state.set({ active: !state.active });
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  return null;
}
