import { useMemo } from 'react';
import { ExtrudeGeometry } from 'three';
import { buildFacadeShape } from './facadeShape';
import { TAJ_PROPORTIONS } from './tajProportions';
import { GREYBOX_COLOR } from '@constants/greyboxMaterials';
import { FACADE_DEPTH_MULTIPLIER, resolveReviewColor, ROUGHNESS_VALUE } from './reviewConfig';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';
import type { LodLevel } from './lod';

const CURVE_SEGMENTS_BY_LOD: Record<LodLevel, number> = { lod0: 12, lod1: 6, lod2: 1 };

/**
 * The façade quarter module: a shallow extruded wall (Part 11: "shallow
 * façade depth") with a real arch opening (Part 11: "real openings only
 * where required") — via `ExtrudeGeometry`'s shape+hole support, never a
 * runtime boolean/CSG operation. Placeholder detail surfaces are plain
 * material slots (Part 11: "placeholder generated-detail surfaces only as
 * plain material slots"), not decal textures — none have been
 * downloaded/generated for this foundation milestone.
 *
 * In bake-off review mode (Phase 3B Part 4) reads the review store for a
 * bounded material/roughness swap, a depth-exaggeration multiplier, and a
 * wireframe diagnostic — a no-op when review mode is inactive.
 */
export function FacadeQuarterModule({ lod }: { lod: LodLevel }) {
  const reviewActive = useBakeoffReviewStore((s) => s.active);
  const material = useBakeoffReviewStore((s) => s.material);
  const roughness = useBakeoffReviewStore((s) => s.roughness);
  const facadeDepth = useBakeoffReviewStore((s) => s.facadeDepth);
  const diagnostic = useBakeoffReviewStore((s) => s.diagnostic);

  const depth = TAJ_PROPORTIONS.facade.depth * (reviewActive ? FACADE_DEPTH_MULTIPLIER[facadeDepth] : 1);

  const geometry = useMemo(() => {
    const shape = buildFacadeShape(lod);
    return new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: CURVE_SEGMENTS_BY_LOD[lod],
    });
  }, [lod, depth]);

  const color = resolveReviewColor(
    'facade',
    GREYBOX_COLOR.bakeoffMarble,
    GREYBOX_COLOR.architecture,
    reviewActive,
    material,
    diagnostic,
  );
  const resolvedRoughness = reviewActive ? ROUGHNESS_VALUE[roughness] : 0.65;
  const wireframe = reviewActive && diagnostic === 'wireframe';

  return (
    <mesh
      name="facade-quarter-module"
      geometry={geometry}
      rotation={[0, 0, 0]}
      position={[0, 0, -depth / 2]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={resolvedRoughness} wireframe={wireframe} />
    </mesh>
  );
}
