import { TAJ_PROPORTIONS } from './tajProportions';

export interface MinaretSection {
  rStart: number;
  rEnd: number;
  height: number;
  centerY: number;
}

/**
 * Computes the stacked tapered cylinder sections for the minaret module —
 * pure and testable without Three.js/React, mirroring `domeGeometry.ts` and
 * `facadeShape.ts`. `MinaretModule` (the R3F adapter) and `lodReport.ts`
 * (the headless measurement/validation report) both consume this so the
 * numbers can never drift between what renders and what gets measured.
 */
export function buildMinaretSections(sectionCount: number, topRadiusOverride?: number): MinaretSection[] {
  const { baseRadius, totalHeight } = TAJ_PROPORTIONS.minaret;
  const topRadius = topRadiusOverride ?? TAJ_PROPORTIONS.minaret.topRadius;
  const sectionHeight = totalHeight / sectionCount;

  return Array.from({ length: sectionCount }, (_, i) => {
    const tStart = i / sectionCount;
    const tEnd = (i + 1) / sectionCount;
    return {
      rStart: baseRadius + (topRadius - baseRadius) * tStart,
      rEnd: baseRadius + (topRadius - baseRadius) * tEnd,
      height: sectionHeight,
      centerY: (i + 0.5) * sectionHeight,
    };
  });
}
