import { useEffect, useMemo } from 'react';
import { Clone, Instance, useGLTF, useTexture } from '@react-three/drei';
import {
  Box3,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type MeshStandardMaterial,
  type Object3D,
} from 'three';
import { AXIS_LAYOUT, PLATFORM } from '@constants/world';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { prepareFoliageMaterial, prepareVegetationScene } from '@core/vegetation/foliageMaterials';
import { extractInstanceGroup, lodNamePredicate } from '@core/vegetation/instancedGltf';
import { CulledInstances } from './CulledInstances';
import { GARDEN_SURFACE_Y, treePlantedY } from './grounding';

const FLANK_SPECIES = ['amberMature', 'redOak', 'amberTall', 'greenBroad'] as const;
type FlankSpecies = (typeof FLANK_SPECIES)[number];
const TREE_MODELS: Record<FlankSpecies, string> = {
  amberMature: '/assets/models/garden-premium/universal-trees/Tree02.glb',
  redOak: '/assets/models/garden-premium/universal-trees/Tree07.glb',
  amberTall: '/assets/models/garden-premium/universal-trees/Tree01.glb',
  greenBroad: '/assets/models/garden-premium/universal-trees/Tree03.glb',
};
const ROOT_EXPOSURE: Record<FlankSpecies, number> = {
  amberMature: 0.18,
  redOak: 0.2,
  amberTall: 0.18,
  greenBroad: 0.2,
};
const MEADOW_MODEL = '/assets/models/garden-premium/plants-scene.glb';
const centerZ = (AXIS_LAYOUT.stairsEnd + AXIS_LAYOUT.platformEnd) / 2;
const sideCenterX = PLATFORM.width / 2 + 12.5;
const bedWidth = 20;
const bedDepth = 35;
const treeInstances = [-1, 1].flatMap((side) => [
  { x: side * 31, z: centerZ + 11, rotation: side > 0 ? 0.25 : -0.25, scale: 0.82, species: 'amberMature' as const },
  { x: side * 43, z: centerZ + 7, rotation: side > 0 ? 0.9 : -0.9, scale: 0.94, species: 'redOak' as const },
  { x: side * 33, z: centerZ - 8, rotation: side > 0 ? 1.4 : -1.4, scale: 0.78, species: 'amberTall' as const },
  { x: side * 45, z: centerZ - 11, rotation: side > 0 ? 2.1 : -2.1, scale: 0.9, species: 'greenBroad' as const },
]);
const meadowInstances = [-1, 1].flatMap((side) => [
  { x: side * 37.5, z: centerZ + 2.5, rotation: side * 0.45, scale: 0.24 },
  { x: side * 27.8, z: centerZ - 5.5, rotation: Math.PI + side * 0.3, scale: 0.22 },
]);

/** Quiet formal planting balances the monument without cluttering its plinth. */
export function MausoleumFlankGardens() {
  const quality = useQualityProfile();
  const amberMature = useGLTF(TREE_MODELS.amberMature);
  const redOak = useGLTF(TREE_MODELS.redOak);
  const amberTall = useGLTF(TREE_MODELS.amberTall);
  const greenBroad = useGLTF(TREE_MODELS.greenBroad);
  const meadow = useGLTF(MEADOW_MODEL);
  const grassSource = useTexture({
    map: '/assets/textures/mat-grass/basecolor.png',
    normalMap: '/assets/textures/mat-grass/normal.png',
    aoMap: '/assets/textures/mat-grass/ao.png',
  });
  const treeScenes = useMemo<Record<FlankSpecies, Object3D>>(() => ({
    amberMature: amberMature.scene,
    redOak: redOak.scene,
    amberTall: amberTall.scene,
    greenBroad: greenBroad.scene,
  }), [amberMature.scene, redOak.scene, amberTall.scene, greenBroad.scene]);
  const partsBySpecies = useMemo(() => Object.fromEntries(FLANK_SPECIES.map((species) => {
    const parts = extractInstanceGroup(treeScenes[species], undefined, lodNamePredicate(0));
    parts.forEach(({ material }) => prepareFoliageMaterial(material as MeshStandardMaterial));
    return [species, parts];
  })) as Record<FlankSpecies, ReturnType<typeof extractInstanceGroup>>, [treeScenes]);
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
      texture.repeat.set(4, 7);
      texture.needsUpdate = true;
    });
    return maps;
  }, [grassSource]);
  const meadowBounds = useMemo(() => new Box3().setFromObject(meadow.scene), [meadow.scene]);
  const meadowCenter = useMemo(() => meadowBounds.getCenter(new Vector3()), [meadowBounds]);

  useEffect(() => {
    prepareVegetationScene(meadow.scene, false);
    return () => {
      Object.values(partsBySpecies).flat().forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
      Object.values(grass).forEach((texture) => texture.dispose());
    };
  }, [grass, meadow.scene, partsBySpecies]);
  return (
    <group name="mausoleum-formal-flank-gardens">
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * sideCenterX, 0.018, centerZ]} receiveShadow>
            <boxGeometry args={[bedWidth, 0.035, bedDepth]} />
            <meshStandardMaterial
              {...grass}
              color="#718d4f"
              roughness={0.9}
              normalScale={new Vector2(0.72, 0.72)}
            />
          </mesh>
          {[-1, 1].map((edge) => (
            <mesh key={`x-${edge}`} position={[side * sideCenterX + edge * bedWidth / 2, 0.065, centerZ]} receiveShadow>
              <boxGeometry args={[0.18, 0.13, bedDepth + 0.35]} />
              <meshStandardMaterial color="#d8cdbb" roughness={0.5} />
            </mesh>
          ))}
          {[-1, 1].map((edge) => (
            <mesh key={`z-${edge}`} position={[side * sideCenterX, 0.065, centerZ + edge * bedDepth / 2]} receiveShadow>
              <boxGeometry args={[bedWidth + 0.35, 0.13, 0.18]} />
              <meshStandardMaterial color="#d8cdbb" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {FLANK_SPECIES.flatMap((species) => {
        const trees = treeInstances.filter((tree) => tree.species === species);
        return partsBySpecies[species].map((part, index) => (
          <CulledInstances key={`${species}-${index}`} range={trees.length}
            castShadow={quality.name === 'high' && species === 'amberMature'} receiveShadow>
            <primitive object={part.geometry} attach="geometry" />
            <primitive object={part.material} attach="material" />
            {trees.map((item, treeIndex) => (
              <Instance key={treeIndex} position={[
                item.x,
                treePlantedY(treeScenes[species], item.scale, ROOT_EXPOSURE[species]),
                item.z,
              ]}
                rotation={[0, item.rotation, 0]} scale={item.scale} />
            ))}
          </CulledInstances>
        ));
      })}
      {(quality.name === 'low' ? meadowInstances.filter((_, index) => index % 2 === 0) : meadowInstances)
        .map((item, index) => (
          <Clone
            key={`flank-meadow-${index}`}
            object={meadow.scene}
            position={[
              item.x - meadowCenter.x * item.scale,
              GARDEN_SURFACE_Y - meadowBounds.min.y * item.scale,
              item.z - meadowCenter.z * item.scale,
            ]}
            rotation={[0, item.rotation, 0]}
            scale={item.scale}
          />
        ))}
    </group>
  );
}

Object.values(TREE_MODELS).forEach((url) => useGLTF.preload(url));
useGLTF.preload(MEADOW_MODEL);
