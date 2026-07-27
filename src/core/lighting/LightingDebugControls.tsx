import { useEffect } from 'react';
import { env } from '@config/env';
import { useLightingDebugStore } from './useLightingDebugStore';

const KEY_HANDLERS: Record<string, keyof ReturnType<typeof useLightingDebugStore.getState>> = {
  KeyF: 'toggleFog',
  KeyP: 'cyclePreset',
  KeyE: 'cycleExposure',
  KeyX: 'toggleShadowDiagnostic',
  KeyT: 'cycleBenchmarkTier',
  KeyD: 'cycleDpr',
  KeyS: 'cycleShadowMapSize',
  KeyY: 'cycleShadowType',
  KeyR: 'reset',
};

/**
 * Dev-only keyboard bindings for the lighting debug axes besides
 * view/toggle (which `LightingCaptureCamera` owns for `V`/`M`) — Phase 4B
 * "Debugging" requirement, extended in Phase 4C with the benchmark
 * overrides (`T`/`D`/`S`/`Y`). Deliberately disjoint from the bake-off
 * review controls' keys (`1`-`0`, `L`, `K`) and only active once lighting
 * debug mode is on, so normal exploration keys are never shadowed.
 */
export function LightingDebugControls() {
  if (!env.enableDebugTools) return null;
  return <LightingDebugControlsInner />;
}

function LightingDebugControlsInner() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!useLightingDebugStore.getState().active) return;
      const action = KEY_HANDLERS[event.code];
      if (!action) return;
      const handler = useLightingDebugStore.getState()[action];
      if (typeof handler === 'function') (handler as () => void)();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
