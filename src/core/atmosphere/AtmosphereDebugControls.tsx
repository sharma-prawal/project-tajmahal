import { useEffect } from 'react';
import { env } from '@config/env';
import { useAtmosphereDebugStore } from './useAtmosphereDebugStore';

export function AtmosphereDebugControls() {
  useEffect(() => {
    if (!env.enableDebugTools) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'KeyI' || event.repeat) return;
      const state = useAtmosphereDebugStore.getState();
      state.set({ active: !state.active });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
