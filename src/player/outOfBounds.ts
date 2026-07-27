/**
 * Pure out-of-bounds detection + safe-checkpoint recovery decision, unit
 * testable without a physics world. `PlayerController` tracks the last
 * grounded position and calls `isOutOfBounds` every fixed step; when true it
 * teleports the rigid body back to that checkpoint and zeroes velocity.
 */
export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function isOutOfBounds(position: { x: number; y: number; z: number }, bounds: Bounds): boolean {
  return (
    position.x < bounds.minX ||
    position.x > bounds.maxX ||
    position.y < bounds.minY ||
    position.y > bounds.maxY ||
    position.z < bounds.minZ ||
    position.z > bounds.maxZ
  );
}

/**
 * Also treats non-finite positions (NaN/Infinity from an invalid physics
 * state, e.g. after a tunneling glitch) as an implicit "must recover" case,
 * distinct from a normal geometric out-of-bounds so callers can log it
 * differently if desired.
 */
export function isInvalidPhysicsState(position: { x: number; y: number; z: number }): boolean {
  return !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z);
}
