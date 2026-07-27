import { MOVEMENT } from '@constants/movement';

/**
 * Pure character-motor math, framework-free and unit-testable in isolation
 * from React/Rapier. Runs once per fixed physics step (see PlayerController's
 * `useBeforePhysicsStep`), not once per render frame — keeping locomotion
 * independent of display refresh rate.
 */
export interface MotorInput {
  /** -1..1, already includes joystick/keyboard deadzone handling. */
  moveRight: number;
  /** -1..1. */
  moveForward: number;
  /** World-space yaw (radians) that "forward" is relative to — the camera's, not the player's own. */
  cameraYaw: number;
  grounded: boolean;
  running?: boolean;
}

export interface MotorTuning {
  walkSpeed: number;
  runMultiplier?: number;
  acceleration: number;
  deceleration: number;
  airControl: number;
}

export interface MotorTarget {
  hasInput: boolean;
  targetVelocityX: number;
  targetVelocityZ: number;
  /** Radians, or null when there's no movement input (caller should hold prior facing). */
  facing: number | null;
  /** Acceleration/deceleration rate to damp toward the target velocity this step. */
  rate: number;
}

export function computeMotorTarget(input: MotorInput, tuning: MotorTuning = MOVEMENT): MotorTarget {
  const rawX = input.moveRight;
  const rawZ = -input.moveForward;
  const length = Math.hypot(rawX, rawZ);
  const hasInput = length > 0.0001;

  let worldX = 0;
  let worldZ = 0;
  let facing: number | null = null;

  if (hasInput) {
    const normX = rawX / length;
    const normZ = rawZ / length;
    // Rotate the local move vector by camera yaw to get a world-space direction.
    worldX = normX * Math.cos(input.cameraYaw) + normZ * Math.sin(input.cameraYaw);
    worldZ = -normX * Math.sin(input.cameraYaw) + normZ * Math.cos(input.cameraYaw);
    facing = Math.atan2(worldX, worldZ);
  }

  const speed = hasInput ? tuning.walkSpeed * (input.running ? tuning.runMultiplier ?? MOVEMENT.runMultiplier : 1) : 0;
  const baseRate = hasInput ? tuning.acceleration : tuning.deceleration;
  const rate = input.grounded ? baseRate : baseRate * tuning.airControl;

  return {
    hasInput,
    targetVelocityX: worldX * speed,
    targetVelocityZ: worldZ * speed,
    facing,
    rate,
  };
}
