import { useMemo } from 'react';
import { LatheGeometry, Vector2 } from 'three';
import { buildDomeProfilePoints } from './domeGeometry';
import { TAJ_PROPORTIONS } from './tajProportions';
import { GREYBOX_COLOR } from '@constants/greyboxMaterials';
import { resolveReviewColor, ROUGHNESS_VALUE } from './reviewConfig';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';
import type { LodLevel } from './lod';

const SEGMENTS_BY_LOD: Record<LodLevel, { profilePoints: number; latheSegments: number }> = {
  lod0: { profilePoints: TAJ_PROPORTIONS.dome.profile.length, latheSegments: TAJ_PROPORTIONS.dome.latheSegments },
  lod1: { profilePoints: 4, latheSegments: 14 },
  lod2: { profilePoints: 3, latheSegments: 8 },
};

/**
 * The dome module: a cylindrical drum + a lathed onion-dome silhouette
 * (Part 11: "lathed main-dome profile") — never a plain sphere. Detail
 * scales with LOD via profile-point/lathe-segment count, not a separate
 * geometry authored by hand per level.
 *
 * In bake-off review mode (Phase 3B Part 4) reads the review store for a
 * bounded material/roughness swap, one conservative alternate profile, and
 * a wireframe diagnostic — a no-op when review mode is inactive.
 */
export function DomeModule({ lod }: { lod: LodLevel }) {
  const { profilePoints, latheSegments } = SEGMENTS_BY_LOD[lod];
  const reviewActive = useBakeoffReviewStore((s) => s.active);
  const material = useBakeoffReviewStore((s) => s.material);
  const roughness = useBakeoffReviewStore((s) => s.roughness);
  const domeProfile = useBakeoffReviewStore((s) => s.domeProfile);
  const diagnostic = useBakeoffReviewStore((s) => s.diagnostic);

  const domeGeometry = useMemo(() => {
    const profileOverride =
      reviewActive && domeProfile === 'conservativeAlternate'
        ? TAJ_PROPORTIONS.dome.conservativeAlternateProfile
        : undefined;
    const points = buildDomeProfilePoints(profilePoints, profileOverride).map((p) => new Vector2(p.x, p.y));
    return new LatheGeometry(points, latheSegments);
  }, [profilePoints, latheSegments, reviewActive, domeProfile]);

  const { drumRadius, drumHeight } = TAJ_PROPORTIONS.dome;
  const color = resolveReviewColor(
    'dome',
    GREYBOX_COLOR.bakeoffMarble,
    GREYBOX_COLOR.architecture,
    reviewActive,
    material,
    diagnostic,
  );
  const resolvedRoughness = reviewActive ? ROUGHNESS_VALUE[roughness] : 0.6;
  const wireframe = reviewActive && diagnostic === 'wireframe';

  return (
    <group name="dome-module">
      <mesh position={[0, drumHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[drumRadius, drumRadius, drumHeight, latheSegments]} />
        <meshStandardMaterial color={color} roughness={resolvedRoughness} wireframe={wireframe} />
      </mesh>
      <mesh geometry={domeGeometry} position={[0, drumHeight, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={Math.max(0.1, resolvedRoughness - 0.1)} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
