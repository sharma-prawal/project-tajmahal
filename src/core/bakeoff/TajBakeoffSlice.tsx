import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import type { Group } from 'three';
import { DomeModule } from './DomeModule';
import { MinaretModule } from './MinaretModule';
import { FacadeQuarterModule } from './FacadeQuarterModule';
import { BakeoffMeasurementsDisplay } from './BakeoffMeasurementsDisplay';
import { TAJ_PROPORTIONS } from './tajProportions';
import { BAKEOFF_SLICE_POSITION } from './bakeoffPosition';
import { selectLod, type LodLevel } from './lod';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';

const MODULE_PIVOT_COLOR = '#ff3ec8';
const BOUNDS_HELPER_COLOR = '#3ee0ff';
/** Roughly matches the slice's live-measured bounds — a fixed reference box for the `bounds` diagnostic, not a computed Box3 (avoids a frame of lag on mount). */
const APPROX_BOUNDS_SIZE: [number, number, number] = [19.5, 32, 16.5];

/**
 * The bounded Taj architectural bake-off slice (Part 11): one façade
 * quarter, one main dome, one minaret, composed as the finite modular hero
 * strategy's proof-of-concept — NOT the complete Taj Mahal, and NOT a
 * generalized building generator. Positioned well off the main walkable
 * route (dev-only, `env.enableDebugTools`-gated by its mount site in
 * `Experience.tsx`) since it is a validation artifact for human review,
 * not part of the greybox walkthrough.
 *
 * LOD switches by camera distance via `selectLod` (with hysteresis) —
 * three deliberate configurations, not a continuous/automated decimation.
 * In bake-off review mode (Phase 3B Part 1), the review store's
 * `lodOverride` can force a specific level for deterministic capture, and
 * `bounds`/`modulePivots` diagnostics overlay reference geometry.
 */
export function TajBakeoffSlice() {
  const groupRef = useRef<Group>(null);
  const [autoLod, setAutoLod] = useState<LodLevel>('lod0');
  const lodRef = useRef<LodLevel>('lod0');
  const reviewActive = useBakeoffReviewStore((s) => s.active);
  const lodOverride = useBakeoffReviewStore((s) => s.lodOverride);
  const diagnostic = useBakeoffReviewStore((s) => s.diagnostic);

  useFrame((state) => {
    if (!groupRef.current) return;
    const distance = state.camera.position.distanceTo(groupRef.current.position);
    const next = selectLod(distance, lodRef.current);
    if (next !== lodRef.current) {
      lodRef.current = next;
      setAutoLod(next);
    }
  });

  const lod: LodLevel = reviewActive && lodOverride !== 'auto' ? lodOverride : autoLod;
  const showBounds = reviewActive && diagnostic === 'bounds';
  const showPivots = reviewActive && diagnostic === 'modulePivots';

  const minaretOffset = TAJ_PROPORTIONS.facade.width / 2 + TAJ_PROPORTIONS.minaret.baseRadius + 2;

  return (
    <group ref={groupRef} name="taj-bakeoff-slice" position={BAKEOFF_SLICE_POSITION}>
      <RigidBody type="fixed" colliders="cuboid">
        <FacadeQuarterModule lod={lod} />
      </RigidBody>
      {showPivots && <PivotMarker />}
      <group position={[0, TAJ_PROPORTIONS.facade.height, 0]}>
        <DomeModule lod={lod} />
        {showPivots && <PivotMarker />}
      </group>
      <RigidBody type="fixed" colliders="cuboid">
        <group position={[minaretOffset, 0, 0]}>
          <MinaretModule lod={lod} />
          {showPivots && <PivotMarker />}
        </group>
      </RigidBody>
      {showBounds && (
        <mesh position={[0, APPROX_BOUNDS_SIZE[1] / 2, 0]}>
          <boxGeometry args={APPROX_BOUNDS_SIZE} />
          <meshBasicMaterial color={BOUNDS_HELPER_COLOR} wireframe />
        </mesh>
      )}
      <BakeoffMeasurementsDisplay />
    </group>
  );
}

/** A small axes-like marker at a module's local origin (Part 6: "module pivots are intentional"). */
function PivotMarker() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial color={MODULE_PIVOT_COLOR} />
    </mesh>
  );
}
