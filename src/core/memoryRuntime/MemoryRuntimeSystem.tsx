import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { memoryRuntime } from './MemoryRuntime';
import { cameraBlendProgress, memoryCameraState } from './MemoryCameraState';
import { useMemoryRuntimeDebugStore } from './useMemoryRuntimeDebugStore';

export function MemoryRuntimeTicker() {
  let debugAccumulator = 0;
  useFrame((_, delta) => { if (memoryRuntime.getSnapshot().activeMemoryId) memoryRuntime.tick(delta * 1000); if (useMemoryRuntimeDebugStore.getState().active) { debugAccumulator += delta; if (debugAccumulator >= .2) { debugAccumulator = 0; useMemoryRuntimeDebugStore.getState().bump(); } } });
  return null;
}

export function MemoryCameraAdapter() {
  const camera = useThree((state) => state.camera);
  const commandId = { current: '' };
  const startPosition = new Vector3();
  const startTarget = new Vector3();
  const desiredPosition = new Vector3();
  const desiredTarget = new Vector3();
  const direction = new Vector3();
  useFrame(() => {
    const command = memoryCameraState.command; if (!command) { commandId.current = ''; return; }
    if (commandId.current !== `${command.owner}:${command.position.join(',')}`) {
      commandId.current = `${command.owner}:${command.position.join(',')}`;
      startPosition.copy(camera.position); camera.getWorldDirection(direction); startTarget.copy(camera.position).addScaledVector(direction, 8);
    }
    const progress = cameraBlendProgress(command.elapsedMs, command.durationMs, useAccessibilityStore.getState().reducedMotion);
    desiredPosition.set(...command.position); desiredTarget.set(...command.target);
    camera.position.lerpVectors(startPosition, desiredPosition, progress);
    direction.lerpVectors(startTarget, desiredTarget, progress); camera.lookAt(direction);
  });
  return null;
}
