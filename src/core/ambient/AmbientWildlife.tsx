import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  DoubleSide,
  Euler,
  Matrix4,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
} from 'three';
import { AMBIENT_FAMILY_ID, type AmbientLifeData } from './ambientLifeData';

interface AmbientWildlifeProps {
  data: AmbientLifeData;
  birdsEnabled: boolean;
  butterfliesEnabled: boolean;
  density: number;
  speed: number;
  paused: boolean;
}

interface WildlifeSeed {
  position: readonly [number, number, number];
  phase: number;
  size: number;
}

function familySeeds(data: AmbientLifeData, family: number): WildlifeSeed[] {
  const seeds: WildlifeSeed[] = [];
  for (let index = 0; index < data.families.length; index += 1) {
    if (data.families[index] !== family) continue;
    seeds.push({
      position: [data.positions[index * 3], data.positions[index * 3 + 1], data.positions[index * 3 + 2]],
      phase: data.phases[index],
      size: data.sizes[index],
    });
  }
  return seeds;
}

function butterflyWingGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.09, 0.03, 0.28, 0.2, 0.34, 0.42);
  shape.bezierCurveTo(0.38, 0.66, 0.18, 0.72, 0.08, 0.5);
  shape.bezierCurveTo(0.02, 0.36, 0.01, 0.14, 0, 0);
  const geometry = new ShapeGeometry(shape, 5);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -0.2);
  return geometry;
}

function birdWingGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.18, 0, 0.5, 0.06, 0.78, 0.2);
  shape.bezierCurveTo(0.54, 0.27, 0.24, 0.25, 0, 0.08);
  shape.closePath();
  const geometry = new ShapeGeometry(shape, 4);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -0.08);
  return geometry;
}

const origin = new Vector3();
const zeroScale = new Vector3(0, 0, 0);
const unitScale = new Vector3(1, 1, 1);
const bodyScale = new Vector3();
const localScale = new Vector3();
const worldPosition = new Vector3();
const bodyRotation = new Quaternion();
const localRotation = new Quaternion();
const poseMatrix = new Matrix4();
const bodyMatrix = new Matrix4();
const localMatrix = new Matrix4();
const wingMatrix = new Matrix4();
const euler = new Euler();

function hideRemainder(mesh: InstancedMesh | null, from: number, count: number) {
  if (!mesh) return;
  for (let index = from; index < count; index += 1) {
    bodyMatrix.compose(origin, bodyRotation.identity(), zeroScale);
    mesh.setMatrixAt(index, bodyMatrix);
  }
}

export function AmbientWildlife({
  data,
  birdsEnabled,
  butterfliesEnabled,
  density,
  speed,
  paused,
}: AmbientWildlifeProps) {
  const birdSeeds = useMemo(() => familySeeds(data, AMBIENT_FAMILY_ID.birds), [data]);
  const butterflySeeds = useMemo(() => familySeeds(data, AMBIENT_FAMILY_ID.butterflies), [data]);
  const birdBodyGeometry = useMemo(() => new SphereGeometry(1, 8, 6), []);
  const birdWing = useMemo(birdWingGeometry, []);
  const butterflyBodyGeometry = useMemo(() => new SphereGeometry(1, 7, 5), []);
  const butterflyWing = useMemo(butterflyWingGeometry, []);
  const birdBodies = useRef<InstancedMesh>(null);
  const birdLeftWings = useRef<InstancedMesh>(null);
  const birdRightWings = useRef<InstancedMesh>(null);
  const butterflyBodies = useRef<InstancedMesh>(null);
  const butterflyLeftWings = useRef<InstancedMesh>(null);
  const butterflyRightWings = useRef<InstancedMesh>(null);
  const elapsed = useRef(0);

  useEffect(() => () => {
    birdBodyGeometry.dispose();
    birdWing.dispose();
    butterflyBodyGeometry.dispose();
    butterflyWing.dispose();
  }, [birdBodyGeometry, birdWing, butterflyBodyGeometry, butterflyWing]);

  useFrame((_, delta) => {
    if (!paused) elapsed.current += delta * speed;
    const time = elapsed.current;
    const birdCount = birdsEnabled ? Math.ceil(birdSeeds.length * density) : 0;
    const butterflyCount = butterfliesEnabled ? Math.ceil(butterflySeeds.length * density) : 0;

    for (let index = 0; index < birdCount; index += 1) {
      const seed = birdSeeds[index];
      const cycle = ((seed.position[0] + time * (3.1 + index * 0.13) + seed.phase * 8 + 60) % 120 + 120) % 120 - 60;
      const z = seed.position[2] + Math.sin(time * (0.12 + index * 0.006) + seed.phase) * (3 + index % 3);
      const y = seed.position[1] + Math.sin(time * 0.56 + seed.phase) * 0.45;
      const dz = Math.cos(time * (0.12 + index * 0.006) + seed.phase) * (0.45 + (index % 3) * 0.12);
      worldPosition.set(cycle, y, z);
      bodyRotation.setFromAxisAngle(origin.set(0, 1, 0), Math.atan2(3.1 + index * 0.13, dz));
      bodyScale.set(0.16, 0.1, 0.34).multiplyScalar(seed.size);
      bodyMatrix.compose(worldPosition, bodyRotation, bodyScale);
      poseMatrix.compose(worldPosition, bodyRotation, unitScale);
      birdBodies.current?.setMatrixAt(index, bodyMatrix);

      const flap = 0.08 + Math.sin(time * (4.6 + index * 0.17) + seed.phase) * 0.18;
      localScale.setScalar(seed.size * 0.72);
      euler.set(0, 0, flap);
      localRotation.setFromEuler(euler);
      localMatrix.compose(origin.set(0.08, 0, -0.03), localRotation, localScale);
      wingMatrix.multiplyMatrices(poseMatrix, localMatrix);
      birdLeftWings.current?.setMatrixAt(index, wingMatrix);
      euler.set(0, 0, -flap);
      localRotation.setFromEuler(euler);
      localScale.x *= -1;
      localMatrix.compose(origin.set(-0.08, 0, -0.03), localRotation, localScale);
      wingMatrix.multiplyMatrices(poseMatrix, localMatrix);
      birdRightWings.current?.setMatrixAt(index, wingMatrix);
    }

    for (let index = 0; index < butterflyCount; index += 1) {
      const seed = butterflySeeds[index];
      const slow = time * (0.32 + (index % 5) * 0.027) + seed.phase;
      const quick = time * (0.91 + (index % 4) * 0.05) + seed.phase * 1.7;
      const x = seed.position[0] + Math.sin(slow) * (0.9 + (index % 3) * 0.3) + Math.sin(quick) * 0.24;
      const z = seed.position[2] + Math.cos(slow * 0.83) * (0.75 + (index % 4) * 0.18) + Math.sin(quick * 0.71) * 0.2;
      const y = seed.position[1] + Math.sin(quick * 1.3) * 0.18 + Math.abs(Math.sin(slow * 2.1)) * 0.12;
      const dx = Math.cos(slow) + Math.cos(quick) * 0.3;
      const dz = -Math.sin(slow * 0.83) * 0.83 + Math.cos(quick * 0.71) * 0.2;
      worldPosition.set(x, y, z);
      bodyRotation.setFromAxisAngle(origin.set(0, 1, 0), Math.atan2(dx, dz));
      bodyScale.set(0.018, 0.018, 0.06).multiplyScalar(seed.size);
      bodyMatrix.compose(worldPosition, bodyRotation, bodyScale);
      poseMatrix.compose(worldPosition, bodyRotation, unitScale);
      butterflyBodies.current?.setMatrixAt(index, bodyMatrix);

      const flap = 0.25 + Math.abs(Math.sin(time * (8.4 + index * 0.11) + seed.phase)) * 0.9;
      localScale.setScalar(seed.size * 0.24);
      euler.set(0, 0, flap);
      localRotation.setFromEuler(euler);
      localMatrix.compose(origin.set(0.025, 0, 0), localRotation, localScale);
      wingMatrix.multiplyMatrices(poseMatrix, localMatrix);
      butterflyLeftWings.current?.setMatrixAt(index, wingMatrix);
      euler.set(0, 0, -flap);
      localRotation.setFromEuler(euler);
      localScale.x *= -1;
      localMatrix.compose(origin.set(-0.025, 0, 0), localRotation, localScale);
      wingMatrix.multiplyMatrices(poseMatrix, localMatrix);
      butterflyRightWings.current?.setMatrixAt(index, wingMatrix);
    }

    for (const [mesh, active, total] of [
      [birdBodies.current, birdCount, birdSeeds.length],
      [birdLeftWings.current, birdCount, birdSeeds.length],
      [birdRightWings.current, birdCount, birdSeeds.length],
      [butterflyBodies.current, butterflyCount, butterflySeeds.length],
      [butterflyLeftWings.current, butterflyCount, butterflySeeds.length],
      [butterflyRightWings.current, butterflyCount, butterflySeeds.length],
    ] as const) {
      hideRemainder(mesh, active, total);
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return <group name="ambient-winged-wildlife">
    <instancedMesh ref={birdBodies} args={[birdBodyGeometry, undefined, birdSeeds.length]} frustumCulled={false}>
      <meshStandardMaterial color="#4b4038" roughness={0.82} />
    </instancedMesh>
    <instancedMesh ref={birdLeftWings} args={[birdWing, undefined, birdSeeds.length]} frustumCulled={false}>
      <meshStandardMaterial color="#5d5147" roughness={0.8} side={DoubleSide} />
    </instancedMesh>
    <instancedMesh ref={birdRightWings} args={[birdWing, undefined, birdSeeds.length]} frustumCulled={false}>
      <meshStandardMaterial color="#5d5147" roughness={0.8} side={DoubleSide} />
    </instancedMesh>
    <instancedMesh ref={butterflyBodies} args={[butterflyBodyGeometry, undefined, butterflySeeds.length]} frustumCulled={false}>
      <meshStandardMaterial color="#4a2f1c" roughness={0.72} />
    </instancedMesh>
    <instancedMesh ref={butterflyLeftWings} args={[butterflyWing, undefined, butterflySeeds.length]} frustumCulled={false}>
      <meshBasicMaterial color="#efaa3f" toneMapped side={DoubleSide} />
    </instancedMesh>
    <instancedMesh ref={butterflyRightWings} args={[butterflyWing, undefined, butterflySeeds.length]} frustumCulled={false}>
      <meshBasicMaterial color="#f4c266" toneMapped side={DoubleSide} />
    </instancedMesh>
  </group>;
}
