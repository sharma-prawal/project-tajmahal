import { useEffect } from 'react';
import { env } from '@config/env';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';

const KEY_HANDLERS: Record<string, keyof ReturnType<typeof useBakeoffReviewStore.getState>> = {
  Digit1: 'cycleBackground',
  Digit2: 'toggleFog',
  Digit3: 'toggleShadows',
  Digit4: 'cycleTier',
  Digit5: 'cycleLod',
  Digit6: 'cycleMaterial',
  Digit7: 'cycleRoughness',
  Digit8: 'cycleFacadeDepth',
  Digit9: 'cycleDomeProfile',
  Digit0: 'cycleMinaretTaper',
  KeyL: 'cycleLightMode',
  KeyK: 'cycleDiagnostic',
  KeyR: 'reset',
};

/**
 * Dev-only keyboard bindings for every bake-off review axis besides
 * view/toggle (which `BakeoffReviewCamera` owns for `B`/`N`) — Phase 3B
 * Part 9's "keys/buttons" requirement. Only active once review mode is on,
 * so normal exploration keys are never shadowed.
 */
export function BakeoffReviewControls() {
  if (!env.enableDebugTools) return null;
  return <BakeoffReviewControlsInner />;
}

function BakeoffReviewControlsInner() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!useBakeoffReviewStore.getState().active) return;
      const action = KEY_HANDLERS[event.code];
      if (!action) return;
      const handler = useBakeoffReviewStore.getState()[action];
      if (typeof handler === 'function') (handler as () => void)();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
