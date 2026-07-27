import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { env } from '@config/env';
import { LIGHTING_CAPTURE_VIEWS } from './lightingCaptureViews';
import { useLightingDebugStore } from './useLightingDebugStore';

const scratchLookAt = new Vector3();

/**
 * Dev-only. `V` toggles the lighting capture mode (parks the normal
 * exploration camera and switches to the seven fixed world-space views in
 * `lightingCaptureViews.ts`); `M` cycles to the next view while active.
 * Deliberately disjoint keybindings from the bake-off review camera
 * (`B`/`N`) so both tools can exist without shadowing each other, though
 * only one is expected to be active at a time in practice.
 */
export function LightingCaptureCamera() {
  if (!env.enableDebugTools) return null;
  return <LightingCaptureCameraInner />;
}

function LightingCaptureCameraInner() {
  const { camera } = useThree();
  const active = useLightingDebugStore((state) => state.active);
  const viewIndex = useLightingDebugStore((state) => state.viewIndex);
  const toggle = useLightingDebugStore((state) => state.toggle);
  const next = useLightingDebugStore((state) => state.next);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyV') toggle();
      if (event.code === 'KeyM' && useLightingDebugStore.getState().active) next();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle, next]);

  useFrame(() => {
    if (!active) return;
    const view = LIGHTING_CAPTURE_VIEWS[viewIndex];
    camera.position.set(view.position[0], view.position[1], view.position[2]);
    scratchLookAt.set(view.lookAt[0], view.lookAt[1], view.lookAt[2]);
    camera.lookAt(scratchLookAt);
  });

  return null;
}
