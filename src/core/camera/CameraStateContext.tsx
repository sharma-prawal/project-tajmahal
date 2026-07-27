import { createContext, useContext, useRef, type ReactNode, type MutableRefObject } from 'react';
import { EXPLORATION_CAMERA } from '@constants/scene';

/**
 * Look/orbit state owned by the camera system. Input adapters (mouse-look,
 * touch-look) write into this via `useCameraState`; the active camera rig
 * reads it to compute orbit position. Movement also reads `yaw` to rotate
 * input into world space — camera orbit is the single source of truth for
 * "which way is forward," not a copy kept on the player.
 *
 * Deliberately a plain ref (not Zustand): this mutates every frame and must
 * never trigger a React re-render.
 */
export interface CameraOrbitState {
  yaw: number;
  pitch: number;
  distance: number;
}

type CameraStateRef = MutableRefObject<CameraOrbitState>;

const CameraStateContext = createContext<CameraStateRef | null>(null);

export function CameraStateProvider({ children }: { children: ReactNode }) {
  const ref = useRef<CameraOrbitState>({
    yaw: 0,
    pitch: 0,
    distance: EXPLORATION_CAMERA.distance,
  });
  return <CameraStateContext.Provider value={ref}>{children}</CameraStateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCameraState(): CameraStateRef {
  const ctx = useContext(CameraStateContext);
  if (!ctx) throw new Error('useCameraState must be used within CameraStateProvider');
  return ctx;
}
