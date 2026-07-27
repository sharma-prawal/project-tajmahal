import type { MovementInput } from '@/types/input';

export interface GamepadControlSample { movement: MovementInput; lookX: number; lookY: number; active: boolean }
export const GAMEPAD_DEAD_ZONE = 0.16;
function deadZone(value: number, threshold = GAMEPAD_DEAD_ZONE): number { const magnitude = Math.abs(value); if (magnitude <= threshold) return 0; return Math.sign(value) * Math.min(1, (magnitude - threshold) / (1 - threshold)); }
export function sampleGamepadAxes(axes: readonly number[] | null | undefined): GamepadControlSample {
  const right = deadZone(axes?.[0] ?? 0); const forward = -deadZone(axes?.[1] ?? 0); const lookX = deadZone(axes?.[2] ?? 0); const lookY = deadZone(axes?.[3] ?? 0);
  const movementLength = Math.hypot(right, forward); const scale = movementLength > 1 ? 1 / movementLength : 1;
  return { movement: { right: right * scale, forward: forward * scale, running: movementLength > 0.92 }, lookX, lookY, active: movementLength > .001 || Math.abs(lookX) > .001 || Math.abs(lookY) > .001 };
}
