import { useProgress } from '@react-three/drei';
import { useEffect } from 'react';
import { useLoadingStore } from '@state/useLoadingStore';

/**
 * Bridges drei's useProgress (tracks THREE.LoadingManager under the hood)
 * into our own store so non-canvas UI (loading screens, HUD) can react to
 * asset progress without reaching into Fiber's render tree.
 */
export function LoadingBridge() {
  const { progress, active } = useProgress();
  const setProgress = useLoadingStore((state) => state.setProgress);
  const setAssetsSettled = useLoadingStore((state) => state.setAssetsSettled);

  useEffect(() => {
    setProgress(progress);
    setAssetsSettled(!active);
  }, [progress, active, setProgress, setAssetsSettled]);

  return null;
}
