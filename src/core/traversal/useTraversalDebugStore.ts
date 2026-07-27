import { create } from 'zustand';
import { CAMERA_DEFAULTS, EXPLORATION_CAMERA } from '@constants/scene';
import { MOVEMENT, MOUSE_LOOK } from '@constants/movement';

interface TraversalDebugState {
  active: boolean;
  walkSpeed: number;
  acceleration: number;
  deceleration: number;
  rotationSmoothing: number;
  cameraDistance: number;
  cameraHeight: number;
  cameraDamping: number;
  fov: number;
  sensitivity: number;
  invertY: boolean;
  collisionDebug: boolean;
  pathVisualization: boolean;
  reducedMotionSimulation: boolean;
  set: (values: Partial<Omit<TraversalDebugState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  active: false,
  walkSpeed: MOVEMENT.walkSpeed,
  acceleration: MOVEMENT.acceleration,
  deceleration: MOVEMENT.deceleration,
  rotationSmoothing: MOVEMENT.rotationSmoothing,
  cameraDistance: EXPLORATION_CAMERA.distance,
  cameraHeight: EXPLORATION_CAMERA.height,
  cameraDamping: EXPLORATION_CAMERA.positionSmoothing,
  fov: CAMERA_DEFAULTS.fov,
  sensitivity: MOUSE_LOOK.sensitivity,
  invertY: false,
  collisionDebug: false,
  pathVisualization: false,
  reducedMotionSimulation: false,
};

export const useTraversalDebugStore = create<TraversalDebugState>((set) => ({
  ...DEFAULTS,
  set: (values) => set(values),
  reset: () => set((state) => ({ ...DEFAULTS, active: state.active })),
}));
