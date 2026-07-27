export interface ExplorationTelemetry {
  x: number; y: number; z: number; velocityX: number; velocityY: number; velocityZ: number; grounded: boolean; slopeDegrees: number | null; yaw: number; pitch: number; cameraX: number; cameraY: number; cameraZ: number;
  activeInput: string; moveForward: number; moveRight: number; locomotionWarmup: boolean;
}
export const createExplorationTelemetry = (): ExplorationTelemetry => ({ x: 0, y: 0, z: 0, velocityX: 0, velocityY: 0, velocityZ: 0, grounded: false, slopeDegrees: null, yaw: 0, pitch: 0, cameraX: 0, cameraY: 0, cameraZ: 0, activeInput: 'unknown', moveForward: 0, moveRight: 0, locomotionWarmup: false });
