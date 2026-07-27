import { useCameraStore } from '@state/useCameraStore';
import { ExplorationCameraRig } from './ExplorationCameraRig';

/**
 * Single entry point for camera behavior. Only `exploration` is implemented
 * in Phase 1; the other modes are named here so future work has a slot to
 * drop into (first-person aim camera, over-the-shoulder third-person,
 * scripted cinematic dollies) without changing how callers select a mode.
 */
export function CameraController() {
  const mode = useCameraStore((state) => state.mode);

  switch (mode) {
    case 'exploration':
      return <ExplorationCameraRig />;
    case 'firstPerson':
    case 'thirdPerson':
    case 'cinematic':
      // Not implemented in Phase 1 — falls back to exploration behavior.
      return <ExplorationCameraRig />;
    default:
      return null;
  }
}
