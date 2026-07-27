import { damp } from '@utils/math';

export interface CameraCollisionInput {
  desiredDistance: number;
  currentDistance: number;
  hitDistance: number | null;
  minimumDistance: number;
  margin: number;
  releaseSmoothing: number;
  delta: number;
}

/** Immediate obstruction response, damped release: avoids clipping without camera-length oscillation after clearing a wall. */
export function resolveCameraCollisionDistance(input: CameraCollisionInput): number {
  if (input.hitDistance !== null) {
    return Math.min(
      input.desiredDistance,
      Math.max(input.minimumDistance, input.hitDistance - input.margin),
    );
  }
  return damp(input.currentDistance, input.desiredDistance, input.releaseSmoothing, input.delta);
}
