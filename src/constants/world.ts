/**
 * Corrected greybox dimensions from the Phase 2 technical review
 * (docs/phase-2/02-world-layout.md). Authoritative for Stage 1 greybox
 * geometry — do not hand-derive these elsewhere.
 *
 * Layout convention: the main axis runs along -Z (player spawns at +Z,
 * walks toward -Z, mausoleum is furthest along -Z). X is left/right across
 * the axis. Y is up.
 */

/**
 * Documented headline envelope (Part 2). Kept as the reference figure for
 * planning docs and manifests. The greybox's *actual* out-of-bounds kill
 * volume (`OOB_BOUNDS` below) is derived from the real per-zone footprints
 * plus a safety margin instead of hardcoding this pair — laying out every
 * documented zone at its literal footprint sums to a slightly longer axis
 * (~230m) than the 220m headline number, since the design bible's
 * zone-by-zone dimensions and its "mandatory route" arithmetic use
 * different levels of rounding/overlap approximation (it is a design bible,
 * not a CAD file). Both are honored: real per-zone footprints are used
 * as-authored for every primitive, and the world bounds are sized to
 * actually contain them rather than clipping the greybox to hit "220"
 * exactly.
 */
export const WORLD_ENVELOPE = {
  width: 220,
  depth: 128,
} as const;

export const FORECOURT = {
  width: 24,
  depth: 20,
} as const;

export const ENTRANCE_GATE = {
  width: 16,
  depth: 9,
  height: 18,
  openingWidth: 7,
  openingHeight: 10,
} as const;

export const GARDEN = {
  axisLength: 92,
  usableWidth: 104,
  mainPathWidth: 3.5,
  channelWidth: 2.5,
  quadrantPathWidth: 2,
  quadrantWidth: 43,
  quadrantDepth: 36,
} as const;

export const POOL = {
  width: 32,
  depth: 8,
  sidePathWidth: 3.5,
} as const;

export const PAVILION = {
  width: 15,
  depth: 9,
  height: 8.5,
  axisOffset: 35, // midpoint of the 32-38m reviewed range
} as const;

export const MEMORY_SPUR = {
  minLength: 12,
  maxLength: 25,
} as const;

export const APPROACH = {
  length: 25, // midpoint of the 22-28m reviewed range
} as const;

export const PLATFORM = {
  width: 48,
  depth: 48,
  height: 3.2,
} as const;

export const MAUSOLEUM = {
  width: 28,
  depth: 28,
  domeApexHeight: 32, // midpoint of 31-33m above platform
} as const;

export const MINARET = {
  height: 24, // midpoint of 23-25m
  radius: 1.2,
  inset: 3, // distance from platform corner
} as const;

export const STAIRS = {
  width: 9,
  rise: 3.2,
  run: 9, // midpoint of 8-10m
  stepCount: 19, // within reviewed 18-20 visible steps
} as const;

export const INTERIOR = {
  width: 14,
  height: 11, // midpoint of 10-12m
} as const;

export const LETTER_PLINTH = {
  clearanceRadius: 4,
} as const;

export const BOUNDARY_WALL = {
  height: 3,
  thickness: 0.5,
} as const;

/**
 * Derived Z positions along the main axis, spawn (+Z, near 0) to mausoleum
 * interior (most negative Z). Each zone's geometry is centered on its own
 * span; these are the boundaries used to place greybox components without
 * every component re-deriving the same running total.
 */
function buildAxisLayout() {
  let z = 0;

  const forecourtStart = z;
  z -= FORECOURT.depth;
  const forecourtEnd = z;

  const gateStart = z;
  z -= ENTRANCE_GATE.depth;
  const gateEnd = z;

  const gardenStart = z;
  z -= GARDEN.axisLength;
  const gardenEnd = z;

  const poolStart = z;
  z -= POOL.depth;
  const poolEnd = z;

  const approachStart = z;
  z -= APPROACH.length;
  const approachEnd = z;

  const platformStart = z;
  z -= STAIRS.run;
  const stairsEnd = z;
  z -= PLATFORM.depth - STAIRS.run;
  const platformEnd = z;

  const mausoleumStart = z;
  z -= MAUSOLEUM.depth;
  const mausoleumEnd = z;

  return {
    forecourtStart,
    forecourtEnd,
    gateStart,
    gateEnd,
    gardenStart,
    gardenEnd,
    poolStart,
    poolEnd,
    approachStart,
    approachEnd,
    platformStart,
    stairsEnd,
    platformEnd,
    mausoleumStart,
    mausoleumEnd,
  };
}

export const AXIS_LAYOUT = buildAxisLayout();

/** Total mandatory-route length implied by the axis layout, for sanity-checking against the reviewed 170-180m band. */
export const MANDATORY_ROUTE_LENGTH = Math.abs(AXIS_LAYOUT.mausoleumEnd) + INTERIOR.width / 2;

const AXIS_MARGIN = 20;
const CROSS_MARGIN = 12;
const CROSS_HALF_WIDTH = Math.max(GARDEN.usableWidth, PLATFORM.width, MAUSOLEUM.width) / 2 + CROSS_MARGIN;

/**
 * The real out-of-bounds kill volume for the greybox, derived from the axis
 * layout + margin rather than the headline 220x128 figure (see
 * `WORLD_ENVELOPE` doc comment). Player positions outside this box trigger
 * out-of-bounds recovery.
 */
export const OOB_BOUNDS = {
  minZ: AXIS_LAYOUT.mausoleumEnd - AXIS_MARGIN,
  maxZ: FORECOURT.depth + AXIS_MARGIN,
  minX: -CROSS_HALF_WIDTH,
  maxX: CROSS_HALF_WIDTH,
  minY: -10,
  maxY: 100,
} as const;
