import { BufferAttribute, BufferGeometry, CylinderGeometry, IcosahedronGeometry } from 'three';
import { mergeParts, transformPart } from './productionGeometry';

/**
 * Phase 10B planting library.
 *
 * The Phase 4E flower asset was a cylinder stem with a squashed sphere cap —
 * geometrically a mushroom — repeated across every bed in one silhouette and
 * three flat colours. A bed is now planted in four *layers*, the way an
 * ornamental scheme actually is (Objective 3):
 *
 *   groundcover → rosette (foliage accent) → spike (height) → flowering
 *
 * The first three are generated here. The fourth is the scanned CC0
 * `flowering-periwinkle` asset — a real flowering plant beats anything
 * procedural at close range, so this module deliberately does not try to
 * compete with it.
 *
 * Generated species are split into a `foliage` part (green, fixed per species)
 * and an optional `bloom` part (per-instance colour via `instanceColor`), so
 * one instanced mesh per part carries the whole garden's colour variation
 * without a geometry-per-colour explosion.
 */
export const BED_LAYERS = ['groundcover', 'rosette', 'spike', 'flowering'] as const;

export type BedLayer = (typeof BED_LAYERS)[number];

/** The layers this module generates; `flowering` is supplied by a scanned asset. */
export const PLANT_SPECIES = ['groundcover', 'rosette', 'spike'] as const;

export type PlantSpecies = (typeof PLANT_SPECIES)[number];

export interface PlantSpeciesProfile {
  /** Foliage tint. Species read apart by hue as well as by silhouette. */
  foliage: string;
  /** Metres at scale 1 — the wind shader's height falloff, and the layer's rank. */
  height: number;
  /** Multiplies the bed's placement scale so each layer sits at its own height. */
  scale: number;
  /** How strongly this layer moves in wind — groundcover barely stirs, spikes nod. */
  windStrength: number;
  /** Pure-foliage layers (groundcover) have no bloom mesh at all. */
  blooms: boolean;
}

export const PLANT_SPECIES_PROFILE: Record<PlantSpecies, PlantSpeciesProfile> = {
  groundcover: { foliage: '#5f7f46', height: 0.16, scale: 2.65, windStrength: 0.22, blooms: false },
  rosette: { foliage: '#4f6f3f', height: 0.5, scale: 1.35, windStrength: 0.45, blooms: true },
  spike: { foliage: '#5a7a48', height: 0.68, scale: 1.26, windStrength: 0.8, blooms: true },
};

/**
 * The generated layers as a repeating drift pattern. The widened groundcover
 * closes soil at the base while rosette and spike layers provide enough
 * vertical foliage for every parterre to read as established planting.
 */
const COMMON_PATTERN = [
  'groundcover', 'spike', 'rosette', 'rosette',
  'groundcover', 'rosette', 'spike', 'rosette',
] as const satisfies readonly PlantSpecies[];

/**
 * Share of plants that are the scanned flowering asset. It is the most
 * expensive thing in the garden by an order of magnitude, so it is placed by
 * its own sparse rule rather than as a slot in the drift pattern — that keeps
 * it evenly spread through every bed instead of depending on which clump
 * indices a particular bed's dimensions happen to reach.
 */
const FLOWERING_SHARE = 0.11;

/** Deterministic per-part jitter — keeps every generated plant reproducible. */
function noise(n: number): number {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * One tapered, arching leaf blade growing along +X: it rises then droops, and
 * is widest about a quarter of the way along, narrowing to a point. That
 * silhouette is the whole difference between reading as a leaf and reading as
 * a card.
 */
function bladeGeometry(length: number, width: number, rise: number, droop: number, rows = 3): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const at = (t: number) => ({
    x: length * t,
    y: rise * t - droop * t * t,
    halfWidth: (width / 2) * Math.sin(Math.min(1, 0.22 + t * 1.3) * Math.PI),
  });
  for (let row = 0; row < rows; row += 1) {
    const t0 = row / rows;
    const t1 = (row + 1) / rows;
    const a = at(t0);
    const b = at(t1);
    positions.push(
      a.x, a.y, -a.halfWidth, a.x, a.y, a.halfWidth, b.x, b.y, b.halfWidth,
      a.x, a.y, -a.halfWidth, b.x, b.y, b.halfWidth, b.x, b.y, -b.halfWidth,
    );
    // Carried so blades merge with the primitive-derived parts (which always
    // ship UVs) — `mergeGeometries` refuses mismatched attribute sets.
    uvs.push(0, t0, 1, t0, 1, t1, 0, t0, 1, t1, 0, t1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** A fan of blades around the origin — the shared root of every foliage form here. */
function bladeFan(
  count: number,
  seed: number,
  blade: () => BufferGeometry,
  { radius = 0, y = 0, pitch = 0, scaleJitter = 0.22 }: { radius?: number; y?: number; pitch?: number; scaleJitter?: number } = {},
): BufferGeometry[] {
  return Array.from({ length: count }, (_, index) => {
    const yaw = (index / count) * Math.PI * 2 + noise(seed + index) * 0.7;
    const scale = 1 - scaleJitter * noise(seed + index * 3.7);
    return transformPart(
      blade(),
      [Math.cos(yaw) * radius, y, Math.sin(yaw) * radius],
      [scale, scale, scale],
      [0, -yaw, pitch * (0.7 + noise(seed + index * 5.1) * 0.6)],
    );
  });
}

/** A small five-petal flower head lying open — used wherever a bloom is visible up close. */
function floretGeometry(petals: number, size: number, seed: number): BufferGeometry[] {
  return bladeFan(petals, seed, () => bladeGeometry(size, size * 0.78, size * 0.16, size * 0.34, 1), {
    radius: size * 0.12,
    pitch: -0.35,
    scaleJitter: 0.16,
  });
}

export function createPlantFoliageGeometry(species: PlantSpecies): BufferGeometry {
  switch (species) {
    case 'groundcover':
      // A low spreading mat — the layer whose whole job is that no soil shows
      // between the plants above it, so it is deliberately the widest relative
      // to its height and the cheapest per plant.
      // Pitched up rather than lying flat: at 0.12 rad the blades read from
      // above as flat leaf decals printed on the soil, not as a plant.
      return mergeParts(bladeFan(9, 11, () => bladeGeometry(0.26, 0.125, 0.16, 0.12), { y: 0.008, pitch: 0.5 }));

    case 'rosette': {
      // Long arching strap leaves (iris / daylily) — the bed's vertical foliage accent.
      const outer = bladeFan(6, 23, () => bladeGeometry(0.34, 0.075, 0.5, 0.26), { y: 0.01, pitch: 0.35 });
      const inner = bladeFan(4, 29, () => bladeGeometry(0.24, 0.062, 0.42, 0.16), { y: 0.02, pitch: 0.62 });
      return mergeParts([...outer, ...inner]);
    }

    case 'spike': {
      // An upright flowering stem over a basal rosette (salvia / hollyhock habit).
      const stem = transformPart(new CylinderGeometry(0.011, 0.021, 0.46, 4), [0, 0.23, 0], [1, 1, 1]);
      const basal = bladeFan(4, 41, () => bladeGeometry(0.19, 0.1, 0.12, 0.11), { y: 0.01, pitch: 0.1 });
      return mergeParts([stem, ...basal]);
    }
  }
}

/**
 * The bloom half of a species, or `null` for pure-foliage layers. Vertex
 * colours run dark at the petal base to bright at the tip so the flower heads
 * still have depth once `instanceColor` tints them to the bed's palette.
 */
export function createPlantBloomGeometry(species: PlantSpecies): BufferGeometry | null {
  let geometry: BufferGeometry;

  switch (species) {
    case 'groundcover':
      return null;

    case 'rosette':
      // Two open flower heads nested among the leaves.
      geometry = mergeParts([
        ...floretGeometry(5, 0.085, 53).map((part) => transformPart(part, [0.03, 0.36, -0.02], [1, 1, 1], [0, 0.4, 0])),
        ...floretGeometry(5, 0.07, 59).map((part) => transformPart(part, [-0.05, 0.28, 0.06], [1, 1, 1], [0, 2.1, 0])),
      ]);
      break;

    case 'spike':
      // A tapering column of florets — the lupine/salvia silhouette that gives beds their height.
      geometry = mergeParts(
        [0.055, 0.049, 0.04, 0.028].map((radius, index) => transformPart(
          new IcosahedronGeometry(radius, 0),
          [(noise(index + 83) - 0.5) * 0.018, 0.36 + index * 0.085, (noise(index + 89) - 0.5) * 0.018],
          [1, 1.25, 1],
        )),
      );
      break;
  }

  const position = geometry.getAttribute('position');
  const bounds = geometry.boundingBox!;
  const span = Math.max(0.001, bounds.max.y - bounds.min.y);
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const shade = 0.78 + ((position.getY(i) - bounds.min.y) / span) * 0.22;
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** Metres across which one species dominates before the planting changes over. */
export const PLANTING_CLUMP_SIZE = 3.4;

/** Sub-clump sizes for the accent and interloper rules — a few plants across, not one. */
const FLOWERING_CLUMP_SIZE = 0.9;
const INTERLOPER_CLUMP_SIZE = 1.1;

/**
 * Which species grows at a point. Real planting schemes are drifts, not
 * per-plant randomness, so species is chosen per ~3.4 m clump; a deterministic
 * minority of plants inside each clump belong to the neighbouring drift, which
 * softens the seams the way an interplanted bed does. The base pattern steps
 * through all four species along both axes rather than hashing, which
 * guarantees every bed contains every layer (Objective 3) instead of leaving it
 * to luck.
 */
export function bedLayerAt(x: number, z: number, bedIndex: number): BedLayer {
  // Both the flowering accent and the drift-softening interloper are decided
  // per small sub-clump, not per plant. Decided per plant they would be
  // salt-and-pepper — which is the procedural-scatter look this phase exists to
  // remove, and is also not how anyone plants: accents go in twos and threes.
  const cell = (size: number, a: number, b: number) =>
    noise(Math.floor(x / size) * a + Math.floor(z / size) * b + bedIndex * 1.7);
  if (cell(FLOWERING_CLUMP_SIZE, 3.31, 5.17) < FLOWERING_SHARE) return 'flowering';
  const clumpX = Math.floor(x / PLANTING_CLUMP_SIZE);
  const clumpZ = Math.floor(z / PLANTING_CLUMP_SIZE);
  const interloper = cell(INTERLOPER_CLUMP_SIZE, 7.13, 3.71) < 0.2 ? 1 : 0;
  // The whole garden sits at negative X and Z, where JS `%` returns a negative
  // remainder — indexing the pattern with it yields `undefined`, i.e. plants
  // that silently never render.
  const step = clumpX * 3 + clumpZ * 5 + bedIndex + interloper;
  return COMMON_PATTERN[((step % COMMON_PATTERN.length) + COMMON_PATTERN.length) % COMMON_PATTERN.length];
}
