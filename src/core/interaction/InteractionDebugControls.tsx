import { useEffect } from 'react';
import { env } from '@config/env';
import { useInteractionDebugStore } from './useInteractionDebugStore';

export function InteractionDebugControls() {
  useEffect(() => {
    if (!env.enableDebugTools) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyJ' || event.repeat) return;
      useInteractionDebugStore.getState().toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return null;
}
