import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Axis-aligned ground rectangle in world X/Z (Y is supplied per surface). */
export interface GroundRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface GroundSurfaceOptions {
  /** World-space height the flat surface sits at. */
  y?: number;
  /** Metres of world space per texture tile — planar UVs are `world / tile`. */
  tile?: number;
}

/**
 * Builds a single merged, upward-facing `BufferGeometry` covering every rect,
 * with **world-planar UVs** (`u = x / tile`, `v = z / tile`) so texel density
 * stays constant across differently-sized zones and no per-instance stretch
 * appears. One geometry → one draw call for an entire ground surface type,
 * which keeps the multi-material ground overhaul cheap (Phase 9A: "Prefer
 * instancing. Avoid unnecessary draw calls."). Pure and deterministic so it
 * can be unit-tested without a WebGL context.
 */
export function buildGroundSurfaceGeometry(
  rects: readonly GroundRect[],
  { y = 0, tile = 4 }: GroundSurfaceOptions = {},
): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const rect of rects) {
    const { minX, maxX, minZ, maxZ } = rect;
    // Two triangles, wound so the face normal points up (+Y). Corners:
    //   a = (minX, minZ)  b = (maxX, minZ)  c = (maxX, maxZ)  d = (minX, maxZ)
    const a: [number, number] = [minX, minZ];
    const b: [number, number] = [maxX, minZ];
    const c: [number, number] = [maxX, maxZ];
    const d: [number, number] = [minX, maxZ];
    for (const [px, pz] of [a, d, c, a, c, b]) {
      positions.push(px, y, pz);
      normals.push(0, 1, 0);
      uvs.push(px / tile, pz / tile);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Expands one rect into the four border strips of a hollow frame of the given
 * band width (a rectangular "ring"). Used to lay a transition material — e.g.
 * a gravel mowing-strip — around a lawn without a full rect underneath it
 * (which would z-fight the lawn plane), so grass reads as blending into gravel
 * and then paving instead of meeting a hard seam.
 */
export function frameRects(rect: GroundRect, band: number): GroundRect[] {
  const { minX, maxX, minZ, maxZ } = rect;
  return [
    { minX: minX - band, maxX: maxX + band, minZ: maxZ, maxZ: maxZ + band }, // far (+Z)
    { minX: minX - band, maxX: maxX + band, minZ: minZ - band, maxZ: minZ }, // near (-Z)
    { minX: minX - band, maxX: minX, minZ, maxZ }, // left (-X)
    { minX: maxX, maxX: maxX + band, minZ, maxZ }, // right (+X)
  ];
}
