/**
 * Pure LOD selection for the bake-off slice's three deliberate
 * configurations (Part 11): LOD0 (full silhouette + principal recesses),
 * LOD1 (silhouette + major recesses), LOD2 (simplified silhouette).
 * Distance-threshold based, with hysteresis so a camera hovering near a
 * boundary doesn't flicker between levels every frame.
 */
export type LodLevel = 'lod0' | 'lod1' | 'lod2';

export interface LodThresholds {
  /** Beyond this distance, drop from lod0 to lod1. */
  lod0To1: number;
  /** Beyond this distance, drop from lod1 to lod2. */
  lod1To2: number;
  /** Fraction of the threshold used as a dead zone to prevent flicker (e.g. 0.1 = 10%). */
  hysteresis: number;
}

export const DEFAULT_LOD_THRESHOLDS: LodThresholds = {
  lod0To1: 30,
  lod1To2: 80,
  hysteresis: 0.1,
};

/**
 * Selects the LOD level for a given camera distance, given the *previous*
 * level (for hysteresis). Pass `null` as `previous` on first evaluation.
 */
export function selectLod(
  distance: number,
  previous: LodLevel | null,
  thresholds: LodThresholds = DEFAULT_LOD_THRESHOLDS,
): LodLevel {
  const { lod0To1, lod1To2, hysteresis } = thresholds;

  if (previous === null) {
    if (distance <= lod0To1) return 'lod0';
    if (distance <= lod1To2) return 'lod1';
    return 'lod2';
  }

  const band01Low = lod0To1 * (1 - hysteresis);
  const band01High = lod0To1 * (1 + hysteresis);
  const band12Low = lod1To2 * (1 - hysteresis);
  const band12High = lod1To2 * (1 + hysteresis);

  switch (previous) {
    case 'lod0':
      return distance > band01High ? (distance > band12High ? 'lod2' : 'lod1') : 'lod0';
    case 'lod1':
      if (distance < band01Low) return 'lod0';
      if (distance > band12High) return 'lod2';
      return 'lod1';
    case 'lod2':
      return distance < band12Low ? (distance < band01Low ? 'lod0' : 'lod1') : 'lod2';
  }
}
