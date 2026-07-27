import { useEffect, useMemo } from 'react';
import { Clone, useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Box3 } from 'three';
import { prepareVegetationScene } from '@core/vegetation/foliageMaterials';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { supportedY } from './grounding';

const BENCH_MODEL = '/assets/models/garden-premium/bench.glb';
const BENCH_SCALE = 2.45;

/**
 * Four deliberate resting points—one on the outer walk of each quarter.
 * Keeping furniture out of the lawns and parterres protects the formal plan.
 */
const BENCHES = [
  { position: [-48.2, -52] as const, rotation: Math.PI / 2 },
  { position: [48.2, -52] as const, rotation: -Math.PI / 2 },
  { position: [-48.2, -98] as const, rotation: Math.PI / 2 },
  { position: [48.2, -98] as const, rotation: -Math.PI / 2 },
] as const;

export function PremiumGardenAssets() {
  const quality = useQualityProfile();
  const bench = useGLTF(BENCH_MODEL);

  useEffect(() => {
    prepareVegetationScene(bench.scene, quality.shadows);
  }, [bench.scene, quality.shadows]);

  // A box collider that matches the bench's measured footprint. Half-extents
  // and centre are the model's own bounds scaled by `BENCH_SCALE`, so the
  // collider is exactly the size of the seat it wraps — no invisible margin —
  // and rides the same ground offset (`supportedY`) as the visible mesh.
  const benchCollider = useMemo(() => {
    bench.scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(bench.scene);
    const half: [number, number, number] = [
      ((bounds.max.x - bounds.min.x) / 2) * BENCH_SCALE,
      ((bounds.max.y - bounds.min.y) / 2) * BENCH_SCALE,
      ((bounds.max.z - bounds.min.z) / 2) * BENCH_SCALE,
    ];
    const center: [number, number, number] = [
      ((bounds.min.x + bounds.max.x) / 2) * BENCH_SCALE,
      ((bounds.min.y + bounds.max.y) / 2) * BENCH_SCALE,
      ((bounds.min.z + bounds.max.z) / 2) * BENCH_SCALE,
    ];
    return { half, center, groundY: supportedY(bench.scene, BENCH_SCALE) };
  }, [bench.scene]);

  return (
    <group name="formal-charbagh-benches">
      {BENCHES.map((item, index) => (
        <Clone
          key={`bench-${index}`}
          object={bench.scene}
          position={[item.position[0], supportedY(bench.scene, BENCH_SCALE), item.position[1]]}
          rotation={[0, item.rotation, 0]}
          scale={BENCH_SCALE}
        />
      ))}
      {BENCHES.map((item, index) => (
        <RigidBody
          key={`bench-collider-${index}`}
          type="fixed"
          colliders={false}
          name={`garden-bench-${index}`}
          position={[item.position[0], benchCollider.groundY, item.position[1]]}
          rotation={[0, item.rotation, 0]}
        >
          <CuboidCollider args={benchCollider.half} position={benchCollider.center} />
        </RigidBody>
      ))}
    </group>
  );
}

useGLTF.preload(BENCH_MODEL);
