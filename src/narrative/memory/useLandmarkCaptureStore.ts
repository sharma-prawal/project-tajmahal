import { create } from 'zustand';

/**
 * Dev-only: signals that the landmark capture rig owns the camera.
 *
 * `ExplorationCameraRig` already yields the camera this way for the bake-off
 * review and lighting-debug capture modes — it drives the camera every frame
 * with damping, so a later `useFrame` that merely writes a position does not
 * reliably win. Yielding is the codebase's established mechanism, and this is
 * a third instance of it rather than a new one.
 *
 * Never set outside `MemoryLandmarkCapture`, which is itself gated on
 * `env.enableDebugTools`, so this is always `false` in a production build.
 */
interface LandmarkCaptureState {
  active: boolean;
  /**
   * Freezes `MemoryVolume`'s phase updates so a forced phase survives longer
   * than one frame.
   *
   * Needed because `cued`, `engaged` and `revealing` are all *cancelled the
   * instant the player leaves the volume* — and during a capture the camera is
   * somewhere else entirely while the player stands at spawn. Without this,
   * three of the four states revert to `idle` before the screenshot lands, and
   * the capture grid shows two distinct states instead of four. (Which is
   * exactly what the first attempt produced.)
   */
  holdPhases: boolean;
  setActive: (active: boolean) => void;
  setHoldPhases: (holdPhases: boolean) => void;
}

export const useLandmarkCaptureStore = create<LandmarkCaptureState>((set) => ({
  active: false,
  holdPhases: false,
  setActive: (active) => set({ active }),
  setHoldPhases: (holdPhases) => set({ holdPhases }),
}));
