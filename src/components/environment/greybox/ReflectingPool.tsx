import { RigidBody } from '@react-three/rapier';
import { AXIS_LAYOUT, POOL } from '@constants/world';
import { GROUND_MATERIAL } from '@constants/groundMaterials';
import { WATER } from '@constants/water';
import { WaterSurfaceMaterial } from '@core/water/WaterSurfaceMaterial';

const poolZ = (AXIS_LAYOUT.poolStart + AXIS_LAYOUT.poolEnd) / 2;
const kerbHeight = 0.3;
const kerbThickness = 0.3;
const copingHeight = 0.08;
const copingY = 0.055;
const copingOverhang = 0.1;

/**
 * The pool basin (visual, non-walkable) ringed by low kerb colliders — the
 * one place in the greybox where Part 3 explicitly requires a hard
 * non-walkable boundary ("you don't wade through the sacred pool"). Phase
 * 4D adds a visible marble coping trim on top of each (still-invisible)
 * kerb collider — the collider stays the physics boundary, the coping is
 * the corresponding visual edge, matching a real reflecting pool's raised
 * marble rim rather than reading as a flat water-to-ground seam.
 */
export function ReflectingPool() {
  return (
    <>
      <mesh position={[0, -0.11, poolZ]} receiveShadow>
        <boxGeometry args={[POOL.width, 0.15, POOL.depth]} />
        <meshStandardMaterial color={WATER.deepColor} roughness={0.72} metalness={0} />
      </mesh>
      <mesh position={[0, 0.015, poolZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[POOL.width - 0.3, POOL.depth - 0.3, 1, 1]} />
        <WaterSurfaceMaterial hero />
      </mesh>

      {/* Subtle shallow-water edge strips ground the reflective plane against its coping. */}
      {[-1, 1].map((side) => <mesh key={`water-edge-z-${side}`} position={[0, 0.022, poolZ + side * (POOL.depth / 2 - 0.23)]}>
        <boxGeometry args={[POOL.width - 0.45, 0.012, WATER.shorelineWidth]} />
        <meshStandardMaterial color="#e7f7ef" emissive="#8fc8c2" emissiveIntensity={0.12} transparent opacity={0.42} roughness={0.28} depthWrite={false} />
      </mesh>)}
      {[-1, 1].map((side) => <mesh key={`water-edge-x-${side}`} position={[side * (POOL.width / 2 - 0.23), 0.023, poolZ]}>
        <boxGeometry args={[WATER.shorelineWidth, 0.012, POOL.depth - 0.45]} />
        <meshStandardMaterial color="#e7f7ef" emissive="#8fc8c2" emissiveIntensity={0.12} transparent opacity={0.38} roughness={0.28} depthWrite={false} />
      </mesh>)}

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, kerbHeight / 2, poolZ - POOL.depth / 2]} visible={false}>
          <boxGeometry args={[POOL.width, kerbHeight, kerbThickness]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, kerbHeight / 2, poolZ + POOL.depth / 2]} visible={false}>
          <boxGeometry args={[POOL.width, kerbHeight, kerbThickness]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-POOL.width / 2, kerbHeight / 2, poolZ]} visible={false}>
          <boxGeometry args={[kerbThickness, kerbHeight, POOL.depth]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[POOL.width / 2, kerbHeight / 2, poolZ]} visible={false}>
          <boxGeometry args={[kerbThickness, kerbHeight, POOL.depth]} />
        </mesh>
      </RigidBody>

      {/* Visible marble coping, one strip per kerb edge. */}
      <mesh position={[0, copingY, poolZ - POOL.depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[POOL.width + copingOverhang * 2, copingHeight, kerbThickness + copingOverhang]} />
        <meshStandardMaterial {...GROUND_MATERIAL.marbleCoping} />
      </mesh>
      <mesh position={[0, copingY, poolZ + POOL.depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[POOL.width + copingOverhang * 2, copingHeight, kerbThickness + copingOverhang]} />
        <meshStandardMaterial {...GROUND_MATERIAL.marbleCoping} />
      </mesh>
      <mesh position={[-POOL.width / 2, copingY, poolZ]} castShadow receiveShadow>
        <boxGeometry args={[kerbThickness + copingOverhang, copingHeight, POOL.depth + copingOverhang * 2]} />
        <meshStandardMaterial {...GROUND_MATERIAL.marbleCoping} />
      </mesh>
      <mesh position={[POOL.width / 2, copingY, poolZ]} castShadow receiveShadow>
        <boxGeometry args={[kerbThickness + copingOverhang, copingHeight, POOL.depth + copingOverhang * 2]} />
        <meshStandardMaterial {...GROUND_MATERIAL.marbleCoping} />
      </mesh>
    </>
  );
}
