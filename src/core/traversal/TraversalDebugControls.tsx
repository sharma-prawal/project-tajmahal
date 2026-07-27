import { useEffect } from 'react';
import { env } from '@config/env';
import { useTraversalDebugStore } from './useTraversalDebugStore';

export function TraversalDebugControls() {
  useEffect(() => {
    if (!env.enableDebugTools) return undefined;
    const keydown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyL' || event.repeat) return;
      const state = useTraversalDebugStore.getState();
      state.set({ active: !state.active });
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  return null;
}
