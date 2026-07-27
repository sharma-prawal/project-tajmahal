import { useMemo, useRef } from 'react';
import { Clone, useGLTF } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  QuadraticBezierCurve3,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
  type Points,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AXIS_LAYOUT, GARDEN } from '@constants/world';
import { GROUND_MATERIAL } from '@constants/groundMaterials';
import { WATER } from '@constants/water';
import { WaterSurfaceMaterial } from '@core/water/WaterSurfaceMaterial';
import { useWaterDebugStore } from '@core/water/useWaterDebugStore';
import { useWaterQuality } from '@core/water/useWaterQuality';
import { useAccessibilityStore } from '@state/useAccessibilityStore';

export const FOUNTAIN_POSITIONS = [
  AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.25,
  AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.75,
] as const;

const WATER_LEVEL = 0.82;
const LOWER_BOWL_LEVEL = 1.36;
const UPPER_BOWL_LEVEL = 2.56;
const CROWN_NOZZLE_LEVEL = 4.04;
const OUTER_RADIUS = 2.08;
const WATER_RADIUS = 1.72;
const PETAL_COUNT = 8;

function mergeFountainParts(parts: BufferGeometry[]) {
  const normalized = parts.map((source) => {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
    }
    return geometry;
  });
  const merged = mergeGeometries(normalized, false);
  if (!merged) throw new Error('Unable to merge normalized Mughal fountain geometry');
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function polygonRing(outerRadius: number, innerRadius: number, sides: number, depth: number) {
  const shape = new Shape();
  for (let index = 0; index <= sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2 + Math.PI / sides;
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new Shape();
  for (let index = sides; index >= 0; index -= 1) {
    const angle = (index / sides) * Math.PI * 2 + Math.PI / sides;
    const x = Math.cos(angle) * innerRadius;
    const y = Math.sin(angle) * innerRadius;
    if (index === sides) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  shape.holes.push(hole);
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 })
    .rotateX(-Math.PI / 2);
}

function scallopedRing(outerRadius: number, innerRadius: number, lobes: number, depth: number) {
  const shape = new Shape();
  const segments = lobes * 4;
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const radius = outerRadius + Math.cos(angle * lobes) * 0.055;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new Shape();
  for (let index = segments; index >= 0; index -= 1) {
    const angle = (index / segments) * Math.PI * 2;
    const radius = innerRadius + Math.cos(angle * lobes) * 0.035;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === segments) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  shape.holes.push(hole);
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 })
    .rotateX(-Math.PI / 2);
}

function buildMarbleGeometry() {
  const parts: BufferGeometry[] = [
    new CylinderGeometry(OUTER_RADIUS, OUTER_RADIUS + 0.12, 0.12, 8).translate(0, 0.06, 0),
    polygonRing(1.98, 1.73, 8, 0.14).translate(0, 0.1, 0),
    scallopedRing(1.78, WATER_RADIUS, PETAL_COUNT, 0.18).translate(0, 0.2, 0),
    new CylinderGeometry(0.48, 0.62, 0.16, 16).translate(0, 0.34, 0),
    new CylinderGeometry(0.28, 0.43, 0.18, 16).translate(0, 0.5, 0),
    new CylinderGeometry(0.16, 0.24, 0.18, 12).translate(0, 0.66, 0),
  ];

  for (let index = 0; index < PETAL_COUNT; index += 1) {
    const angle = index * Math.PI * 2 / PETAL_COUNT;
    const petal = new SphereGeometry(0.22, 10, 6)
      .scale(1, 0.28, 0.48)
      .rotateY(-angle)
      .translate(Math.sin(angle) * 0.31, 0.71, Math.cos(angle) * 0.31);
    parts.push(petal);
  }
  parts.push(new SphereGeometry(0.13, 12, 8).scale(1, 0.7, 1).translate(0, 0.77, 0));
  return mergeFountainParts(parts);
}

function buildInlayGeometry() {
  return mergeFountainParts([
    polygonRing(2.025, 1.965, 8, 0.012).translate(0, 0.245, 0),
    polygonRing(1.845, 1.8, 8, 0.012).translate(0, 0.302, 0),
    new TorusGeometry(0.47, 0.018, 4, 32).rotateX(-Math.PI / 2).translate(0, 0.43, 0),
  ]);
}

const MARBLE_GEOMETRY = buildMarbleGeometry();
const INLAY_GEOMETRY = buildInlayGeometry();

function radialCascade(
  count: number,
  startRadius: number,
  startY: number,
  controlRadius: number,
  controlY: number,
  endRadius: number,
  endY: number,
  tubeRadius: number,
) {
  return mergeGeometries(Array.from({ length: count }, (_, index) => {
    const angle = index * Math.PI * 2 / count + Math.PI / count;
    const direction = new Vector3(Math.sin(angle), 0, Math.cos(angle));
    const curve = new QuadraticBezierCurve3(
      direction.clone().multiplyScalar(startRadius).setY(startY),
      direction.clone().multiplyScalar(controlRadius).setY(controlY),
      direction.clone().multiplyScalar(endRadius).setY(endY),
    );
    return new TubeGeometry(curve, 20, tubeRadius, 7, false);
  }), false)!;
}

const UPPER_CASCADE_GEOMETRY = radialCascade(
  8, 0.25, 2.54, 0.42, 2.36, 0.7, LOWER_BOWL_LEVEL + 0.035, 0.022,
);
const LOWER_CASCADE_GEOMETRY = radialCascade(
  12, 0.9, 1.34, 1.13, 1.18, 1.53, WATER_LEVEL + 0.035, 0.026,
);
const CROWN_SPRAY_GEOMETRY = mergeGeometries(Array.from({ length: 6 }, (_, index) => {
  const angle = index * Math.PI / 3;
  const direction = new Vector3(Math.sin(angle), 0, Math.cos(angle));
  return new QuadraticBezierCurve3(
    direction.clone().multiplyScalar(0.02).setY(CROWN_NOZZLE_LEVEL),
    direction.clone().multiplyScalar(0.18).setY(4.64),
    direction.clone().multiplyScalar(0.48).setY(3.96),
  );
}).map((curve) => new TubeGeometry(curve, 22, 0.024, 7, false)), false)!;
const CENTRAL_JET_GEOMETRY = new TubeGeometry(
  new QuadraticBezierCurve3(
    new Vector3(0, CROWN_NOZZLE_LEVEL, 0),
    new Vector3(0.025, 4.62, 0),
    new Vector3(0, 4.82, 0),
  ),
  20,
  0.026,
  8,
  false,
);

function splashGeometry() {
  const positions: number[] = [];
  for (let index = 0; index < 56; index += 1) {
    const angle = index * 2.399963;
    const upper = index % 3 === 0;
    const radius = upper ? 0.18 + (index % 5) * 0.035 : 1.05 + (index % 9) * 0.055;
    positions.push(
      Math.cos(angle) * radius,
      (upper ? LOWER_BOWL_LEVEL : WATER_LEVEL) + 0.025 + (index % 5) * 0.025,
      Math.sin(angle) * radius,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

const SPLASH_GEOMETRY = splashGeometry();

function WaterJetMaterial({ opacity = 0.78 }: { opacity?: number }) {
  return <meshPhysicalMaterial
    color="#b9e8ee"
    emissive={WATER.shallowColor}
    emissiveIntensity={0.06}
    transparent
    opacity={Math.min(opacity, 0.72)}
    roughness={0.08}
    transmission={0.28}
    thickness={0.09}
    ior={1.33}
    clearcoat={0.35}
    clearcoatRoughness={0.12}
    depthWrite={false}
  />;
}

function FountainFlow() {
  const flow = useRef<Group>(null);
  const rippleA = useRef<Mesh>(null);
  const rippleB = useRef<Mesh>(null);
  const splash = useRef<Points>(null);
  const paused = useWaterDebugStore((state) => state.paused);
  const speed = useWaterDebugStore((state) => state.waveSpeed);
  const quality = useWaterQuality();
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);

  useFrame((state) => {
    if (paused || reducedMotion || !flow.current) return;
    const t = state.clock.elapsedTime * Math.max(0.35, speed * 35);
    flow.current.position.y = Math.sin(t * 1.7) * 0.008;
    if (splash.current) {
      splash.current.rotation.y = t * 0.22;
      splash.current.scale.setScalar(0.9 + Math.sin(t * 2.4) * 0.06);
    }
    for (const [ring, phase] of [[rippleA.current, 0], [rippleB.current, 0.5]] as const) {
      if (!ring) continue;
      const progress = (t * 0.15 + phase) % 1;
      ring.scale.setScalar(0.65 + progress * 1.45);
      const material = Array.isArray(ring.material) ? ring.material[0] : ring.material;
      material.opacity = 0.22 * (1 - progress);
    }
  });

  return <group ref={flow} name="FiveJetFountainFlow">
    <mesh geometry={CENTRAL_JET_GEOMETRY}>
      <WaterJetMaterial opacity={quality.name === 'low' ? 0.72 : 0.9} />
    </mesh>
    <mesh geometry={CROWN_SPRAY_GEOMETRY}>
      <WaterJetMaterial opacity={quality.name === 'high' ? 0.82 : 0.7} />
    </mesh>
    <mesh geometry={UPPER_CASCADE_GEOMETRY}>
      <WaterJetMaterial opacity={quality.name === 'high' ? 0.84 : 0.72} />
    </mesh>
    {quality.name !== 'low' && <mesh geometry={LOWER_CASCADE_GEOMETRY}>
      <WaterJetMaterial opacity={quality.name === 'high' ? 0.86 : 0.7} />
    </mesh>}
    {quality.name === 'high' && !reducedMotion && <points ref={splash} geometry={SPLASH_GEOMETRY}>
      <pointsMaterial color="#d8f7f4" size={0.045} transparent opacity={0.55} depthWrite={false} />
    </points>}
    {!reducedMotion && <mesh ref={rippleA} position={[0, WATER_LEVEL + 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.72, 0.018, 5, 48]} />
      <WaterJetMaterial opacity={0.2} />
    </mesh>}
    {!reducedMotion && <mesh ref={rippleB} position={[0, WATER_LEVEL + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.72, 0.014, 5, 48]} />
      <WaterJetMaterial opacity={0.14} />
    </mesh>}
    <mesh position={[0, LOWER_BOWL_LEVEL + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.82, 0.024, 6, 56]} />
      <WaterJetMaterial opacity={0.42} />
    </mesh>
    <mesh position={[0, UPPER_BOWL_LEVEL + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.23, 0.016, 5, 36]} />
      <WaterJetMaterial opacity={0.38} />
    </mesh>
  </group>;
}

function MughalHauz({ z }: { z: number }) {
  const waterRotation = useMemo(() => -Math.PI / 2, []);
  const premiumFountain = useGLTF('/assets/models/garden-premium/medieval-fountain.glb');
  return <group position={[0, 0, z]} name="MughalHauzFountain">
    <RigidBody type="fixed" colliders={false}>
      {/* Circular basin collider — a cylinder matching the marble coping radius,
          so it hugs the round hauz instead of throwing square corners out into
          the walk the way a bounding-box collider would. Tall enough to stop
          the walker's capsule at the rim. */}
      <CylinderCollider args={[0.9, OUTER_RADIUS]} position={[0, 0.9, 0]} />
    </RigidBody>
    <mesh geometry={MARBLE_GEOMETRY} visible={false}>
      <meshStandardMaterial {...GROUND_MATERIAL.marbleCoping} color="#f0e4cd" roughness={0.48} />
    </mesh>
    <mesh geometry={INLAY_GEOMETRY} visible={false}>
      <meshStandardMaterial color="#9f604d" roughness={0.6} metalness={0.02} />
    </mesh>
    <group position={[0, 2.02, 0]} scale={0.016}>
      <Clone object={premiumFountain.scene} castShadow receiveShadow />
    </group>
    <mesh position={[0, WATER_LEVEL, 0]} rotation={[waterRotation, 0, 0]}>
      <circleGeometry args={[WATER_RADIUS, 64]} />
      <WaterSurfaceMaterial opacity={0.94} />
    </mesh>
    <mesh position={[0, LOWER_BOWL_LEVEL, 0]} rotation={[waterRotation, 0, 0]}>
      <circleGeometry args={[0.86, 48]} />
      <WaterSurfaceMaterial opacity={0.9} />
    </mesh>
    <mesh position={[0, UPPER_BOWL_LEVEL, 0]} rotation={[waterRotation, 0, 0]}>
      <circleGeometry args={[0.25, 32]} />
      <WaterSurfaceMaterial opacity={0.88} />
    </mesh>
    <FountainFlow />
  </group>;
}

export function Fountains() {
  return <>{FOUNTAIN_POSITIONS.map((z) => <MughalHauz key={z} z={z} />)}</>;
}

useGLTF.preload('/assets/models/garden-premium/medieval-fountain.glb');

export const FOUNTAIN_ART_METRICS = Object.freeze({
  fountainCount: FOUNTAIN_POSITIONS.length,
  jetCountPerFountain: 27,
  symmetryOrder: 8,
  outerRadius: OUTER_RADIUS,
  waterRadius: WATER_RADIUS,
  waterLevel: WATER_LEVEL,
  maximumJetHeight: 4.82,
});
