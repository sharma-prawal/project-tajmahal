import {
  BufferAttribute,
  BufferGeometry,
  DodecahedronGeometry,
  Euler,
  Matrix4,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function transformPart(geometry: BufferGeometry, position: [number, number, number], scale: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
  geometry.applyMatrix4(new Matrix4().makeScale(...scale));
  geometry.applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...rotation)));
  geometry.translate(...position);
  if (!geometry.index) return geometry;
  const nonIndexed = geometry.toNonIndexed();
  geometry.dispose();
  return nonIndexed;
}

export function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  const result = mergeGeometries(parts, false);
  if (!result) throw new Error('Vegetation geometry merge failed');
  result.computeVertexNormals();
  result.computeBoundingBox();
  result.computeBoundingSphere();
  parts.forEach((part) => part.dispose());
  return result;
}

// Phase 10B removed `createShrubGeometry` (three merged icosahedron lobes —
// green rocks at any distance) and `createFlowerClusterGeometry` (a cylinder
// stem under a squashed sphere — geometrically a mushroom, repeated across
// every bed). Shrubs now instance scanned CC0 plants; beds are planted from
// `gardenPlanting.ts`.
//
// Phase 10D removed the last two, both dead since Phase 9D and both marked
// REMOVE by the 10B audit without ever being deleted:
//
// - `createTreeCanopyGeometry` / `createTreeTrunkGeometry` — icosahedron lobes
//   on a cylinder. `Trees.tsx` now instances real photoscanned species at the
//   same authored anchors.
// - `createHedgeGeometry` — a box plus three lobes in flat untextured
//   `#4f6b46`. Reviving it would have put ~240 flat-shaded primitives back
//   into a world whose shrubs were upgraded away from exactly that look, and
//   two of its four rows ran at x = ±7.2, walling in the central channel — the
//   garden's best view. See the Phase 10D report.

export function createGrassTuftGeometry(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  for (let blade = 0; blade < 7; blade += 1) {
    const angle = (blade / 7) * Math.PI * 2;
    const radius = blade % 2 === 0 ? 0.13 : 0.08;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const width = 0.055;
    const height = 0.32 + (blade % 3) * 0.07;
    const dx = Math.cos(angle + Math.PI / 2) * width;
    const dz = Math.sin(angle + Math.PI / 2) * width;
    positions.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x, height, z);
    colors.push(0, 0, 0, 0, 0, 0, 1, 1, 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createRockGeometry(variant: number): BufferGeometry {
  const geometry = new DodecahedronGeometry(0.38, 0);
  const position = geometry.getAttribute('position');
  const seed = variant + 1;
  for (let i = 0; i < position.count; i += 1) {
    const p = new Vector3().fromBufferAttribute(position, i);
    const wobble = 0.88 + (((i * 37 + seed * 19) % 17) / 17) * 0.24;
    p.x *= wobble * (0.85 + (variant % 3) * 0.12);
    p.y *= 0.58 + (variant % 2) * 0.12;
    p.z *= (1.08 - (variant % 3) * 0.08) * wobble;
    position.setXYZ(i, p.x, p.y + 0.24, p.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
