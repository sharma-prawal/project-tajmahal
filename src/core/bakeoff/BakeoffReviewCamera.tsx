import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { env } from '@config/env';
import { BAKEOFF_REVIEW_VIEWS } from './reviewViews';
import { BAKEOFF_SLICE_POSITION } from './bakeoffPosition';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';

const scratchOrigin = new Vector3(...BAKEOFF_SLICE_POSITION);
const scratchPosition = new Vector3();
const scratchLookAt = new Vector3();

/**
 * Dev-only. `B` toggles bake-off review mode (parks the normal exploration
 * camera and switches to the six fixed views); `N` cycles to the next view
 * while active. This is the "deterministic screenshot capture support"
 * (Part 11) — an exact, repeatable camera pose to screenshot from, not an
 * automated image-diff pipeline.
 */
export function BakeoffReviewCamera() {
  if (!env.enableDebugTools) return null;
  return <BakeoffReviewCameraInner />;
}

function BakeoffReviewCameraInner() {
  const { camera } = useThree();
  const active = useBakeoffReviewStore((state) => state.active);
  const viewIndex = useBakeoffReviewStore((state) => state.viewIndex);
  const toggle = useBakeoffReviewStore((state) => state.toggle);
  const next = useBakeoffReviewStore((state) => state.next);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyB') toggle();
      if (event.code === 'KeyN' && useBakeoffReviewStore.getState().active) next();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle, next]);

  useFrame(() => {
    if (!active) return;
    const view = BAKEOFF_REVIEW_VIEWS[viewIndex];

    scratchPosition.set(view.position[0], view.position[1], view.position[2]);
    scratchPosition.add(scratchOrigin);
    camera.position.copy(scratchPosition);

    scratchLookAt.set(view.lookAt[0], view.lookAt[1], view.lookAt[2]);
    scratchLookAt.add(scratchOrigin);
    camera.lookAt(scratchLookAt);
  });

  return null;
}
