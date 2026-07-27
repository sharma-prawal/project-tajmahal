import { useMemo } from 'react';
import { TAJ_PROPORTIONS } from './tajProportions';
import { buildMinaretSections } from './minaretGeometry';
import { GREYBOX_COLOR } from '@constants/greyboxMaterials';
import { resolveReviewColor, ROUGHNESS_VALUE } from './reviewConfig';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';
import type { LodLevel } from './lod';

const SEGMENTS_BY_LOD: Record<LodLevel, { radialSegments: number; sectionCount: number; showBand: boolean }> = {
  lod0: {
    radialSegments: 12,
    sectionCount: TAJ_PROPORTIONS.minaret.sectionCount,
    showBand: true,
  },
  lod1: { radialSegments: 8, sectionCount: 2, showBand: true },
  lod2: { radialSegments: 6, sectionCount: 1, showBand: false },
};

/**
 * The minaret module: several stacked tapered cylinder sections (Part 11:
 * "tapered minaret sections") plus one balcony band ring (Part 11:
 * "separate balcony bands") — collapses to a single tapered cylinder with
 * no band at LOD2.
 *
 * In bake-off review mode (Phase 3B Part 4) reads the review store for a
 * bounded material/roughness swap, one conservative alternate taper, and a
 * wireframe diagnostic — a no-op when review mode is inactive.
 */
export function MinaretModule({ lod }: { lod: LodLevel }) {
  const { radialSegments, sectionCount, showBand } = SEGMENTS_BY_LOD[lod];
  const reviewActive = useBakeoffReviewStore((s) => s.active);
  const material = useBakeoffReviewStore((s) => s.material);
  const roughness = useBakeoffReviewStore((s) => s.roughness);
  const minaretTaper = useBakeoffReviewStore((s) => s.minaretTaper);
  const diagnostic = useBakeoffReviewStore((s) => s.diagnostic);

  const { baseRadius, totalHeight, balconyBandHeightFraction, balconyBandThickness, balconyBandRadiusMultiplier } =
    TAJ_PROPORTIONS.minaret;
  const topRadius =
    reviewActive && minaretTaper === 'conservativeAlternate'
      ? TAJ_PROPORTIONS.minaret.conservativeAlternateTopRadius
      : TAJ_PROPORTIONS.minaret.topRadius;

  const sections = useMemo(() => buildMinaretSections(sectionCount, topRadius), [sectionCount, topRadius]);

  const bandRadius =
    (baseRadius + (topRadius - baseRadius) * balconyBandHeightFraction) * balconyBandRadiusMultiplier;
  const bandY = totalHeight * balconyBandHeightFraction;

  const color = resolveReviewColor(
    'minaret',
    GREYBOX_COLOR.bakeoffMarble,
    GREYBOX_COLOR.architecture,
    reviewActive,
    material,
    diagnostic,
  );
  const resolvedRoughness = reviewActive ? ROUGHNESS_VALUE[roughness] : 0.6;
  const wireframe = reviewActive && diagnostic === 'wireframe';
  // The band keeps its own darker tone across material/roughness choices (it exists to read as
  // a distinct architectural feature) but must still honour the silhouette/material-slot diagnostics.
  const bandColor =
    reviewActive && diagnostic === 'silhouetteMask'
      ? '#000000'
      : reviewActive && diagnostic === 'materialSlots'
        ? color
        : GREYBOX_COLOR.architectureShadow;

  return (
    <group name="minaret-module">
      {sections.map((section, i) => (
        <mesh key={i} position={[0, section.centerY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[section.rEnd, section.rStart, section.height, radialSegments]} />
          <meshStandardMaterial color={color} roughness={resolvedRoughness} wireframe={wireframe} />
        </mesh>
      ))}
      {showBand && (
        <mesh position={[0, bandY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[bandRadius, bandRadius, balconyBandThickness, radialSegments]} />
          <meshStandardMaterial color={bandColor} roughness={0.7} wireframe={wireframe} />
        </mesh>
      )}
      <mesh position={[0, totalHeight + 0.4, 0]} castShadow>
        <coneGeometry args={[topRadius * 1.1, 0.8, radialSegments]} />
        <meshStandardMaterial color={color} roughness={Math.max(0.1, resolvedRoughness - 0.1)} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
