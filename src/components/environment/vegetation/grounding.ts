import { Box3, type BufferGeometry, type Object3D } from 'three';

/** Top of the rendered lawn/soil dressing, slightly above the terrain mesh. */
export const GARDEN_SURFACE_Y = 0.012;

/**
 * The horizontal radius of a planted asset's trunk, measured from the authored
 * geometry rather than guessed. `extractInstanceGroup` re-centres each part on
 * its XZ footprint and drops its base to y=0, so a low slice of the mesh is the
 * trunk (and any root flare) with the canopy excluded — exactly the shape a
 * collider must match so it stops the walker at the bark and never throws an
 * invisible wall out under the canopy.
 *
 * A high percentile instead of the raw maximum keeps one stray low twig from
 * inflating the radius, and the slice is deliberately shallow so low conifer
 * skirts do not widen it. Returns the model-space radius at scale 1; callers
 * multiply by the instance scale.
 */
export function trunkFootprintRadius(
  parts: readonly { geometry: BufferGeometry; height: number }[],
  { lowFraction = 0.03, highFraction = 0.13, percentile = 0.92 } = {},
) {
  if (parts.length === 0) return 0;
  const height = parts[0].height;
  const yLow = height * lowFraction;
  const yHigh = height * highFraction;
  const radii: number[] = [];
  for (const { geometry } of parts) {
    const position = geometry.getAttribute('position');
    if (!position) continue;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      if (y < yLow || y > yHigh) continue;
      radii.push(Math.hypot(position.getX(index), position.getZ(index)));
    }
  }
  if (radii.length === 0) return 0;
  radii.sort((a, b) => a - b);
  return radii[Math.min(radii.length - 1, Math.floor(radii.length * percentile))];
}

/** For benches, pots, rocks, and other objects whose lowest point must touch. */
export function supportedY(object: Object3D, scale: number, surfaceY = GARDEN_SURFACE_Y) {
  object.updateMatrixWorld(true);
  return surfaceY - new Box3().setFromObject(object).min.y * scale;
}

/**
 * For vegetation authored around y=0. Negative roots belong below grade and
 * must not lift the visible stem, trunk, or pot above the garden surface.
 */
export function plantedY(surfaceY = GARDEN_SURFACE_Y) {
  return surfaceY;
}

/**
 * Universal tree packs use different root-ball depths. Burying every species
 * by one world metre made small trees look swallowed while large roots could
 * still float. This derives burial from the authored bounds and final scale,
 * leaving only the requested fraction of the root ball visible.
 */
export function treePlantedY(
  object: Object3D,
  scale: number,
  visibleRootFraction = 0.2,
  surfaceY = GARDEN_SURFACE_Y,
) {
  object.updateMatrixWorld(true);
  const rootDepth = Math.max(0, -new Box3().setFromObject(object).min.y);
  const visible = Math.min(1, Math.max(0, visibleRootFraction));
  return surfaceY - rootDepth * scale * (1 - visible);
}

/** For trees with an authored root ball whose lowest roots are below grade. */
export function rootCrownY(
  object: Object3D,
  scale: number,
  rootBurialDepth: number,
  surfaceY = GARDEN_SURFACE_Y,
) {
  return supportedY(object, scale, surfaceY) - rootBurialDepth * scale;
}
