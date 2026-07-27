import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { usePlayerTarget } from '@core/camera/PlayerTargetContext';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { interactionRuntime } from './InteractionRuntime';
import { useInteractionDebugStore } from './useInteractionDebugStore';

const DETECTION_INTERVAL_SECONDS = 0.1;

export function InteractionSystem() {
  const playerTarget = usePlayerTarget();
  const camera = useThree((state) => state.camera);
  const forward = useRef(new Vector3());
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    accumulator.current += delta;
    if (accumulator.current < DETECTION_INTERVAL_SECONDS) return;
    accumulator.current %= DETECTION_INTERVAL_SECONDS;
    const player = playerTarget.current;
    if (!player) return;
    camera.getWorldDirection(forward.current);
    const debugActive = useInteractionDebugStore.getState().active;
    interactionRuntime.update(
      {
        x: player.position.x,
        y: player.position.y + 1.2,
        z: player.position.z,
        forwardX: forward.current.x,
        forwardY: forward.current.y,
        forwardZ: forward.current.z,
        distanceScale: useAccessibilityStore.getState().interactionDistanceScale,
      },
      performance.now(),
      debugActive,
    );
    if (debugActive) useInteractionDebugStore.getState().bump();
  });
  return null;
}
