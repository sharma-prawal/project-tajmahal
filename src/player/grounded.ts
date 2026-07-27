/**
 * Pure shape-cast grounding decisions, framework-free and unit-testable in
 * isolation from Rapier. `PlayerController` performs the actual
 * `world.castShape` call (a downward-facing Ball cast from the capsule
 * center) and feeds the plain hit result through `evaluateGrounded` here —
 * replacing the old flat-rest-height heuristic so ramps, the platform edge,
 * and any future slope report grounded correctly (docs/phase-2/03-player-guidance.md).
 */

/** Plain shape-cast hit — decoupled from Rapier's `ColliderShapeCastHit` type so this stays testable without a physics world. */
export interface ShapeCastHit {
  /** Distance from the cast origin to the hit surface, along the cast direction. */
  distance: number;
  /** Surface normal at the hit point, world space. */
  normal: { x: number; y: number; z: number };
}

export interface SlopeClassification {
  /** Angle between the surface normal and world-up, in degrees. 0 = flat. */
  angleDeg: number;
  /** Whether the surface is shallow enough to walk on without sliding. */
  walkable: boolean;
}

export interface GroundedResult {
  grounded: boolean;
  distance: number | null;
  slope: SlopeClassification | null;
}

/** Maximum slope the player can stand on/ascend without sliding — a ramp at ~20° (the stairs' ramp collider) must classify as walkable. */
export const MAX_WALKABLE_SLOPE_DEG = 45;

/** How far below the cast origin counts as "still touching the ground" — tuned to the capsule's cast radius/margin, not the old fixed rest-height. */
export const GROUND_CAST_MAX_DISTANCE = 0.15;

/** Bounded downward correction closes tiny ramp/landing seams without step-up launches. */
export function groundSnapCorrection(distance: number | null, verticalVelocity: number, maxDistance: number = GROUND_CAST_MAX_DISTANCE): number {
  if (distance === null || distance <= 0.004 || distance > maxDistance || verticalVelocity > 0) return 0;
  return -distance;
}

export function classifySlope(normal: { x: number; y: number; z: number }): SlopeClassification {
  const length = Math.hypot(normal.x, normal.y, normal.z);
  const normalizedY = length > 0 ? normal.y / length : 1;
  const clampedY = Math.min(1, Math.max(-1, normalizedY));
  const angleDeg = (Math.acos(clampedY) * 180) / Math.PI;
  return { angleDeg, walkable: angleDeg <= MAX_WALKABLE_SLOPE_DEG };
}

/** Prefer a walkable fallback when the sphere cast first touches a nearby wall or ramp edge. */
export function selectGroundHit(primary: ShapeCastHit | null, fallback: ShapeCastHit | null): ShapeCastHit | null {
  if (!primary || classifySlope(primary.normal).walkable) return primary ?? fallback;
  return fallback && classifySlope(fallback.normal).walkable ? fallback : primary;
}

/**
 * Turns a raw (possibly null) shape-cast hit into a grounded decision.
 * Null hit (nothing within cast range) => not grounded, e.g. stepping off
 * an edge. A hit beyond `maxDistance` is treated the same as no hit — the
 * player has left the ground and gravity should take over (falling, then
 * regrounding naturally re-evaluates true on the next step that lands
 * within range).
 */
export function evaluateGrounded(
  hit: ShapeCastHit | null,
  maxDistance: number = GROUND_CAST_MAX_DISTANCE,
): GroundedResult {
  if (!hit || hit.distance > maxDistance) {
    return { grounded: false, distance: hit?.distance ?? null, slope: null };
  }
  const slope = classifySlope(hit.normal);
  return { grounded: slope.walkable, distance: hit.distance, slope };
}
