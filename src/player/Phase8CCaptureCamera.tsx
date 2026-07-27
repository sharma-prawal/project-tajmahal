import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { env } from '@config/env';

const FOUNTAIN_LOOK_AT = new Vector3(0, 0.45, -52);

/** Fixed development-only review camera used by the Phase 8C fountain capture. */
export function Phase8CCaptureCamera() {
  const { camera } = useThree();
  const fountainView = env.enableDebugTools && new URLSearchParams(window.location.search).get('phase8cView') === 'fountain';
  useFrame(() => {
    if (!fountainView) return;
    camera.position.set(4.8, 2.5, -47.2);
    camera.lookAt(FOUNTAIN_LOOK_AT);
  });
  return null;
}
