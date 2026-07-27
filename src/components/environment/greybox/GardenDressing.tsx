import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AXIS_LAYOUT, GARDEN } from '@constants/world';
import { GROUND_MATERIAL } from '@constants/groundMaterials';
import { WATER } from '@constants/water';
import { WaterSurfaceMaterial } from '@core/water/WaterSurfaceMaterial';
import { useTexture } from '@react-three/drei';
import { InstancedMesh, Matrix4, Quaternion, RepeatWrapping, SRGBColorSpace, Vector2, Vector3 } from 'three';
import { COMPOSED_FLOWER_BED_BOUNDS, COMPOSED_FORECOURT_BED_BOUNDS, COMPOSED_TAJ_FRONT_BED_BOUNDS } from '@core/vegetation/composition';

const ALL_BED_BOUNDS = [...COMPOSED_FLOWER_BED_BOUNDS, ...COMPOSED_FORECOURT_BED_BOUNDS, ...COMPOSED_TAJ_FRONT_BED_BOUNDS];
import type { Bounds2D } from '@core/vegetation/placement';
import { buildGroundSurfaceGeometry } from '@core/environment/groundSurface';
import { useGroundSurfaces } from '@core/environment/useGroundSurfaces';

const gardenCenterZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const quadrantOffsetX = GARDEN.usableWidth / 4;
const firstHalfZ = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.25;
const secondHalfZ = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.75;

const BED_SOIL_Y = 0.03;
const EDGE_BAND = 0.14;
const EDGE_HEIGHT = 0.13;

const matrix = new Matrix4();
const quaternion = new Quaternion();
const positionScratch = new Vector3();
const scaleScratch = new Vector3();

/** Four low stone edging strips ringing one raised bed — the "cultivated" cue. */
function bedEdgeSpecs(bounds: Bounds2D) {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const y = EDGE_HEIGHT / 2;
  return [
    { position: [cx, y, bounds.maxZ] as const, scale: [width + EDGE_BAND * 2, EDGE_HEIGHT, EDGE_BAND] as const },
    { position: [cx, y, bounds.minZ] as const, scale: [width + EDGE_BAND * 2, EDGE_HEIGHT, EDGE_BAND] as const },
    { position: [bounds.minX, y, cz] as const, scale: [EDGE_BAND, EDGE_HEIGHT, depth] as const },
    { position: [bounds.maxX, y, cz] as const, scale: [EDGE_BAND, EDGE_HEIGHT, depth] as const },
  ];
}

function BedEdging() {
  const specs = useMemo(() => ALL_BED_BOUNDS.flatMap(bedEdgeSpecs), []);
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
    <instancedMesh ref={ref} args={[undefined, undefined, specs.length]} receiveShadow castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial {...GROUND_MATERIAL.marbleInlay} />
    </instancedMesh>
  );
}

/**
 * Visual-only dressing on the shared `Terrain` collider: the central water
 * channel, the four Charbagh lawns, and the cultivated flower beds. Phase 9A:
 * lawns are nudged to a maintained garden-green (they previously read as dry
 * tan and merged into the dirt), and each flower bed is now a raised, textured
 * garden-soil patch ringed by a low stone edging — a real planted bed, not a
 * flat decal on the ground. The gravel beds the lawns sit on come from
 * `GroundZones`.
 */
export function GardenDressing() {
  const { gardenSoil } = useGroundSurfaces();
  const grassSource = useTexture({
    map: '/assets/textures/mat-grass/basecolor.png',
    normalMap: '/assets/textures/mat-grass/normal.png',
    aoMap: '/assets/textures/mat-grass/ao.png',
  });
  const grass = useMemo(() => {
    const maps = {
      map: grassSource.map.clone(),
      normalMap: grassSource.normalMap.clone(),
      aoMap: grassSource.aoMap.clone(),
    };
    maps.map.colorSpace = SRGBColorSpace;
    Object.values(maps).forEach((texture) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(7, 6);
      texture.needsUpdate = true;
    });
    return maps;
  }, [grassSource]);

  const soilGeometry = useMemo(
    () => buildGroundSurfaceGeometry(ALL_BED_BOUNDS, { y: BED_SOIL_Y, tile: 1.2 }),
    [],
  );
  useEffect(() => () => soilGeometry.dispose(), [soilGeometry]);

  return (
    <>
        {/* The calm rill surface extends beneath the solid marble coping so its
          long geometric edges cannot alias against the recessed basin at grazing angles. */}
      <mesh position={[0, -0.07, gardenCenterZ]} receiveShadow>
        <boxGeometry args={[GARDEN.channelWidth, 0.14, GARDEN.axisLength]} />
        <meshStandardMaterial color={WATER.deepColor} roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0, 0.008, gardenCenterZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GARDEN.channelWidth + 0.02, GARDEN.axisLength - 0.3]} />
        <WaterSurfaceMaterial stable calmReflector reflectionResolutionCap={512} />
      </mesh>
      {[
        { x: -quadrantOffsetX, z: firstHalfZ },
        { x: quadrantOffsetX, z: firstHalfZ },
        { x: -quadrantOffsetX, z: secondHalfZ },
        { x: quadrantOffsetX, z: secondHalfZ },
      ].map((q, i) => (
        <mesh key={i} position={[q.x, 0.012, q.z]} receiveShadow>
          <boxGeometry args={[GARDEN.quadrantWidth, 0.01, GARDEN.quadrantDepth]} />
          <meshStandardMaterial
            {...grass}
            color="#7fac4f"
            roughness={0.82}
            metalness={0}
            normalScale={new Vector2(0.8, 0.8)}
          />
        </mesh>
      ))}

      <mesh geometry={soilGeometry} material={gardenSoil} receiveShadow />
      <BedEdging />
    </>
  );
}
