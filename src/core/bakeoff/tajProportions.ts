/**
 * Central proportion specification for the Taj architectural bake-off slice
 * (docs/phase-2/06-asset-decision-framework.md — "finite, code-assembled
 * modular hero"). Single source of truth for the three modules built here:
 * one façade quarter, one main dome, one minaret. This is NOT a generalized
 * building generator — these numbers describe one specific composition.
 *
 * Roughly proportioned against the real Taj Mahal's silhouette ratios
 * (dome-to-drum, minaret taper, iwan arch), compressed to this project's
 * greybox scale (docs/phase-2/02-world-layout.md: dome apex ~31-33m above
 * platform, minarets ~23-25m).
 */
export const TAJ_PROPORTIONS = {
  facade: {
    /** One quarter of the 28m mausoleum façade width. */
    width: 14,
    height: 16,
    /** Shallow on purpose (Part 11: "shallow façade depth", not full building volume). */
    depth: 2,
  },
  arch: {
    width: 6,
    height: 12,
    /** How far the arch's pointed apex rises above its springline, as a fraction of width. */
    apexRatio: 0.55,
  },
  dome: {
    drumRadius: 8,
    drumHeight: 3,
    /** Onion-dome profile control points, (radiusFraction, heightFraction) pairs from drum-top (0) to apex (1), lathed into the final silhouette. */
    profile: [
      { r: 1.0, h: 0.0 },
      { r: 1.08, h: 0.18 },
      { r: 0.95, h: 0.42 },
      { r: 0.55, h: 0.72 },
      { r: 0.18, h: 0.92 },
      { r: 0.0, h: 1.0 },
    ],
    apexHeight: 13,
    latheSegments: 24,
    /**
     * One conservative alternate profile for the Part 4 bounded visual
     * comparison — a flatter, less bulbous onion silhouette. Not a second
     * production candidate, just a deliberately different reference point
     * for the human reviewer.
     */
    conservativeAlternateProfile: [
      { r: 1.0, h: 0.0 },
      { r: 1.02, h: 0.2 },
      { r: 0.85, h: 0.48 },
      { r: 0.5, h: 0.78 },
      { r: 0.0, h: 1.0 },
    ],
  },
  minaret: {
    baseRadius: 1.2,
    topRadius: 0.75,
    /** Conservative alternate taper for the Part 4 comparison — less aggressive narrowing. */
    conservativeAlternateTopRadius: 0.95,
    totalHeight: 24,
    /** Number of stacked tapered sections (Part 11: "tapered minaret sections"). */
    sectionCount: 3,
    balconyBandHeightFraction: 0.62,
    balconyBandThickness: 0.4,
    balconyBandRadiusMultiplier: 1.35,
  },
} as const;
