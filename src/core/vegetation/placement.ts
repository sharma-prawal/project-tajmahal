import { createSeededRandom, randomRange } from './random';

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface VegetationInstance {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface PlacementOptions {
  bounds: Bounds2D;
  /** Grid cell size (metres) — the base spacing before jitter, not a literal lattice (Part "avoid perfect grids"). */
  cellSize: number;
  /** Fraction of each cell's size the point may be jittered off-centre, in [0, 1]. */
  jitter: number;
  /** Rectangles instances must not fall inside — paths, pool, platform footprints. */
  exclusions: Bounds2D[];
  /** Per-cell probability of placing nothing at all (Part "avoid ... visible repetition" / "not overgrown"). */
  skipProbability: number;
  scaleRange: [number, number];
  seed: number;
  groundY?: number;
}

function insideBounds(x: number, z: number, b: Bounds2D): boolean {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

/**
 * Deterministic jittered-grid placement (Phase 4E "controlled procedural
 * variation") — a real grid walk, not `Math.random()` scatter, so density
 * stays even while individual positions/rotations/scales still vary and
 * regular rows never read as a lattice. Skips any point that falls inside
 * an exclusion rectangle (paths/pool/platform) or is dropped by
 * `skipProbability` (deliberate gaps, not uniform coverage). Pure and
 * fully deterministic for a given `seed` — the same garden every load,
 * every capture, every test.
 */
export function placeVegetation(options: PlacementOptions): VegetationInstance[] {
  const { bounds, cellSize, jitter, exclusions, skipProbability, scaleRange, seed, groundY = 0 } = options;
  const random = createSeededRandom(seed);
  const instances: VegetationInstance[] = [];

  const halfJitter = (cellSize * jitter) / 2;

  for (let x = bounds.minX + cellSize / 2; x <= bounds.maxX; x += cellSize) {
    for (let z = bounds.minZ + cellSize / 2; z <= bounds.maxZ; z += cellSize) {
      if (random() < skipProbability) continue;

      const jx = x + randomRange(random, -halfJitter, halfJitter);
      const jz = z + randomRange(random, -halfJitter, halfJitter);

      if (!insideBounds(jx, jz, bounds)) continue;
      if (exclusions.some((zone) => insideBounds(jx, jz, zone))) continue;

      instances.push({
        position: [jx, groundY, jz],
        rotationY: randomRange(random, 0, Math.PI * 2),
        scale: randomRange(random, scaleRange[0], scaleRange[1]),
      });
    }
  }

  return instances;
}

/** Expands a rectangle uniformly by `margin` on every side — the usual shape of a path/pool/platform "keep clear" exclusion. */
export function expandBounds(bounds: Bounds2D, margin: number): Bounds2D {
  return {
    minX: bounds.minX - margin,
    maxX: bounds.maxX + margin,
    minZ: bounds.minZ - margin,
    maxZ: bounds.maxZ + margin,
  };
}

export interface LinearRowOptions {
  /** Start/end points along the row (a straight line, e.g. one side of a path). */
  from: [number, number];
  to: [number, number];
  spacing: number;
  jitter: number;
  scaleRange: [number, number];
  seed: number;
  groundY?: number;
}

/**
 * A deterministic, evenly-spaced row with small position/scale jitter —
 * for hedges lining a path edge, where `placeVegetation`'s area-fill
 * jittered grid is the wrong shape (Part "decorative hedges" reads as a
 * line, not a patch).
 */
export function placeLinearRow(options: LinearRowOptions): VegetationInstance[] {
  const { from, to, spacing, jitter, scaleRange, seed, groundY = 0 } = options;
  const random = createSeededRandom(seed);
  const [x0, z0] = from;
  const [x1, z1] = to;
  const length = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(1, Math.floor(length / spacing));
  const dirX = (x1 - x0) / length;
  const dirZ = (z1 - z0) / length;
  const halfJitter = spacing * jitter * 0.5;

  const instances: VegetationInstance[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i * spacing;
    const jx = x0 + dirX * t + randomRange(random, -halfJitter, halfJitter);
    const jz = z0 + dirZ * t + randomRange(random, -halfJitter, halfJitter);
    instances.push({
      position: [jx, groundY, jz],
      rotationY: randomRange(random, 0, Math.PI * 2),
      scale: randomRange(random, scaleRange[0], scaleRange[1]),
    });
  }
  return instances;
}
