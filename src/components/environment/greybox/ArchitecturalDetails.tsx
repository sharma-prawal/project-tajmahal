import { useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { AXIS_LAYOUT, BOUNDARY_WALL, GARDEN, OOB_BOUNDS } from '@constants/world';
import { GROUND_MATERIAL } from '@constants/groundMaterials';
import { useQualityProfile } from '@hooks/useQualityProfile';

interface BoxSpec { position: [number, number, number]; scale: [number, number, number] }
const matrix = new Matrix4(); const quaternion = new Quaternion(); const position = new Vector3(); const scale = new Vector3();

function StaticBoxes({ specs, material }: { specs: BoxSpec[]; material: typeof GROUND_MATERIAL.marbleCoping | typeof GROUND_MATERIAL.marbleInlay | typeof GROUND_MATERIAL.sandstoneShadow }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current; if (!mesh) return;
    specs.forEach((spec, index) => { position.fromArray(spec.position); scale.fromArray(spec.scale); matrix.compose(position, quaternion, scale); mesh.setMatrixAt(index, matrix); });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingBox(); mesh.computeBoundingSphere();
  }, [specs]);
  return <instancedMesh ref={ref} args={[undefined, undefined, specs.length]} castShadow={false} receiveShadow>
    <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial {...material} />
  </instancedMesh>;
}

function buildBedFrames(): BoxSpec[] {
  const x = GARDEN.usableWidth / 4; const z1 = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.25; const z2 = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.75;
  return [-x, x].flatMap((cx) => [z1, z2].flatMap((cz) => [
    { position: [cx, 0.055, cz - GARDEN.quadrantDepth / 2] as [number, number, number], scale: [GARDEN.quadrantWidth, 0.09, 0.2] as [number, number, number] },
    { position: [cx, 0.055, cz + GARDEN.quadrantDepth / 2] as [number, number, number], scale: [GARDEN.quadrantWidth, 0.09, 0.2] as [number, number, number] },
    { position: [cx - GARDEN.quadrantWidth / 2, 0.055, cz] as [number, number, number], scale: [0.2, 0.09, GARDEN.quadrantDepth] as [number, number, number] },
    { position: [cx + GARDEN.quadrantWidth / 2, 0.055, cz] as [number, number, number], scale: [0.2, 0.09, GARDEN.quadrantDepth] as [number, number, number] },
  ]));
}
function buildChannelCoping(): BoxSpec[] {
  const centerZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
  return [-1, 1].map((side) => ({ position: [side * (GARDEN.channelWidth / 2 + 0.12), 0.07, centerZ], scale: [0.24, 0.12, GARDEN.axisLength] }));
}
function buildBoundaryPiers(): BoxSpec[] {
  const depthStart = AXIS_LAYOUT.forecourtStart + 4; const depthEnd = AXIS_LAYOUT.mausoleumEnd - 3;
  const side = [-1, 1].flatMap((sign) => Array.from({ length: 18 }, (_, index) => ({ position: [sign * OOB_BOUNDS.maxX, BOUNDARY_WALL.height / 2 + 0.2, depthStart + (depthEnd - depthStart) * index / 17] as [number, number, number], scale: [0.9, BOUNDARY_WALL.height + 0.4, 0.9] as [number, number, number] })));
  const ends = [AXIS_LAYOUT.forecourtStart + 6, AXIS_LAYOUT.mausoleumEnd - 4].flatMap((z) => Array.from({ length: 13 }, (_, index) => ({ position: [OOB_BOUNDS.minX + (OOB_BOUNDS.maxX - OOB_BOUNDS.minX) * index / 12, BOUNDARY_WALL.height / 2 + 0.2, z] as [number, number, number], scale: [0.9, BOUNDARY_WALL.height + 0.4, 0.9] as [number, number, number] })));
  return [...side, ...ends];
}

/** Shared, instanced architectural cadence: geometry creates depth and rhythm
 * without textures, unique materials, or per-frame work. */
export function ArchitecturalDetails() {
  const quality = useQualityProfile();
  const bedFrames = useMemo(buildBedFrames, []); const channel = useMemo(buildChannelCoping, []);
  const piers = useMemo(buildBoundaryPiers, []);
  return <>
    <StaticBoxes specs={bedFrames} material={GROUND_MATERIAL.marbleInlay} />
    <StaticBoxes specs={channel} material={GROUND_MATERIAL.marbleCoping} />
    {quality.name !== 'low' && <StaticBoxes specs={piers} material={GROUND_MATERIAL.sandstoneShadow} />}
  </>;
}
