import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { InstancedMesh, Matrix4, type MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { AXIS_LAYOUT, PLATFORM, STAIRS } from '@constants/world';
import { makeArchMaterial, tileRepeat, useArchTextureSets } from '@core/environment/useArchitecturalMaterials';

const stepRise = STAIRS.rise / STAIRS.stepCount;
const stepRun = STAIRS.run / STAIRS.stepCount;
const rampAngle = Math.atan(STAIRS.rise / STAIRS.run);
const rampLength = Math.hypot(STAIRS.run, STAIRS.rise);
const rampCenterZ = (AXIS_LAYOUT.platformStart + AXIS_LAYOUT.stairsEnd) / 2;
const rampThickness = 0.3;

const platformTopZ = (AXIS_LAYOUT.stairsEnd + AXIS_LAYOUT.platformEnd) / 2;
const platformTopLength = AXIS_LAYOUT.stairsEnd - AXIS_LAYOUT.platformEnd;

const deckThickness = 0.08;
const edgeBandHeight = 0.18;
const edgeBandDepth = 0.22;

const steps = Array.from({ length: STAIRS.stepCount }, (_, i) => ({
  height: (i + 1) * stepRise,
  z: AXIS_LAYOUT.platformStart - (i + 0.5) * stepRun,
}));

interface BoxSpec { position: readonly [number, number, number]; scale: readonly [number, number, number] }
const matrix = new Matrix4();
const quaternion = new Quaternion();
const positionScratch = new Vector3();
const scaleScratch = new Vector3();

function InstancedBoxes({ specs, material }: { specs: BoxSpec[]; material: MeshStandardMaterial }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    specs.forEach((spec, index) => {
      positionScratch.fromArray(spec.position);
      scaleScratch.fromArray(spec.scale);
      matrix.compose(positionScratch, quaternion, scaleScratch);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [specs]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, specs.length]} material={material} receiveShadow castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

const stepNosings: BoxSpec[] = steps.map((step) => ({
  position: [0, step.height, step.z + stepRun / 2 - 0.02] as const,
  scale: [STAIRS.width + 0.06, 0.05, 0.14] as const,
}));

const retainingWallDetail: BoxSpec[] = [-1, 1].flatMap((side) => {
  const pilasters = Array.from({ length: 5 }, (_, k) => ({
    position: [
      side * (PLATFORM.width / 2 + 0.11),
      PLATFORM.height / 2 + 0.1,
      platformTopZ - platformTopLength / 2 + (k + 0.5) * (platformTopLength / 5),
    ] as const,
    scale: [0.22, PLATFORM.height - 0.6, 0.9] as const,
  }));
  const stringCourse = {
    position: [side * (PLATFORM.width / 2 + 0.08), PLATFORM.height - 0.45, platformTopZ] as const,
    scale: [0.16, 0.16, platformTopLength + 0.1] as const,
  };
  return [...pilasters, stringCourse];
});

function disposeMaterial(material: MeshStandardMaterial) {
  material.map?.dispose();
  material.normalMap?.dispose();
  material.roughnessMap?.dispose();
  material.dispose();
}

/**
 * Raised platform (chabutra), stepped stairs over a single hidden ramp collider
 * (Part 4). Phase 9B swaps the flat solid-colour palette for the shared
 * architectural PBR. The Taj's chabutra is a single white-marble structure:
 * body, stairs, deck, base course, tread nosings, bands and pilasters share
 * one restrained marble family so no side reads as a separate brown wall.
 * Geometry, collider and navigation are unchanged.
 */
export function Platform() {
  const { marble } = useArchTextureSets();
  const mats = useMemo(() => ({
    body: makeArchMaterial(marble, { tint: '#e5e1d7', repeat: tileRepeat(PLATFORM.width, PLATFORM.height, 3.2), anisotropy: 8, roughness: 0.55, normalScale: 0.52, envMapIntensity: 0.82 }),
    step: makeArchMaterial(marble, { tint: '#eeeae1', repeat: [6, 1], anisotropy: 8, roughness: 0.48, normalScale: 0.48, envMapIntensity: 0.9 }),
    deck: makeArchMaterial(marble, { repeat: tileRepeat(PLATFORM.width, platformTopLength, 3.5), anisotropy: 8, roughness: 0.34, normalScale: 0.5, envMapIntensity: 1.05 }),
    trim: makeArchMaterial(marble, { repeat: 2, anisotropy: 8, roughness: 0.42, normalScale: 0.5, envMapIntensity: 0.95 }),
  }), [marble]);
  useEffect(() => () => Object.values(mats).forEach(disposeMaterial), [mats]);

  const nosings = useMemo(() => stepNosings, []);
  const wallDetail = useMemo(() => retainingWallDetail, []);

  return (
    <>
      {steps.map((step, i) => (
        <mesh key={i} position={[0, step.height / 2, step.z]} receiveShadow material={mats.step}>
          <boxGeometry args={[STAIRS.width, step.height, stepRun]} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[STAIRS.width / 2, rampThickness / 2, rampLength / 2]}
          position={[0, STAIRS.rise / 2, rampCenterZ]}
          rotation={[rampAngle, 0, 0]}
          friction={0.12}
        />
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, PLATFORM.height / 2, platformTopZ]} castShadow receiveShadow material={mats.body}>
          <boxGeometry args={[PLATFORM.width, PLATFORM.height, platformTopLength]} />
        </mesh>
      </RigidBody>

      {/* Marble base course molding — grounds the plinth and reads as a foot. */}
      <mesh position={[0, 0.2, platformTopZ]} receiveShadow material={mats.trim}>
        <boxGeometry args={[PLATFORM.width + 0.5, 0.4, platformTopLength + 0.5]} />
      </mesh>

      <mesh position={[0, PLATFORM.height + deckThickness / 2, platformTopZ]} receiveShadow material={mats.deck}>
        <boxGeometry args={[PLATFORM.width, deckThickness, platformTopLength]} />
      </mesh>
      {[-1, 1].map((side) => <mesh key={`plinth-edge-x-${side}`} position={[side * (PLATFORM.width / 2 - edgeBandDepth / 2), PLATFORM.height - edgeBandHeight / 2, platformTopZ]} receiveShadow material={mats.trim}>
        <boxGeometry args={[edgeBandDepth, edgeBandHeight, platformTopLength]} />
      </mesh>)}
      <mesh position={[0, PLATFORM.height - edgeBandHeight / 2, AXIS_LAYOUT.platformEnd + edgeBandDepth / 2]} receiveShadow material={mats.trim}>
        <boxGeometry args={[PLATFORM.width, edgeBandHeight, edgeBandDepth]} />
      </mesh>

      <InstancedBoxes specs={nosings} material={mats.trim} />
      <InstancedBoxes specs={wallDetail} material={mats.trim} />
    </>
  );
}
