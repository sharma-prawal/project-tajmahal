/** Pure orbit math, kept framework-free so it's trivially unit-testable. */
export interface OrbitOffset {
  x: number;
  y: number;
  z: number;
}

/**
 * Spherical camera offset around a pivot: `yaw` rotates around the vertical
 * axis, `pitch` tilts the orbit above/below the horizontal plane, `distance`
 * is the orbit radius, `baseHeight` is a fixed vertical offset added on top
 * (keeps the camera roughly at shoulder height even at zero pitch).
 */
export function computeOrbitOffset(
  yaw: number,
  pitch: number,
  distance: number,
  baseHeight: number,
): OrbitOffset {
  const horizontal = distance * Math.cos(pitch);
  return {
    x: horizontal * Math.sin(yaw),
    y: baseHeight + distance * Math.sin(pitch),
    z: horizontal * Math.cos(yaw),
  };
}
