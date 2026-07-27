import { useEffect, useMemo } from 'react';
import { Instance, useGLTF } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import type { MeshStandardMaterial } from 'three';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { prepareFoliageMaterial } from '@core/vegetation/foliageMaterials';
import { COMPOSED_ACCENT_TREES } from '@core/vegetation/composition';
import { extractInstanceGroup, lodNamePredicate } from '@core/vegetation/instancedGltf';
import { CulledInstances } from './CulledInstances';
import { treePlantedY, trunkFootprintRadius } from './grounding';

/** Trunk collider dimensions shared with the avenue layer: bark-hugging, capsule-tall. */
const TRUNK_COLLIDER_HALF_HEIGHT = 1.1;
const TRUNK_COLLIDER_MIN_RADIUS = 0.22;
const TRUNK_COLLIDER_MAX_RADIUS = 0.95;

function trunkColliderRadius(modelRadius: number, scale: number) {
  return Math.min(TRUNK_COLLIDER_MAX_RADIUS, Math.max(TRUNK_COLLIDER_MIN_RADIUS, modelRadius * scale));
}


const ACCENT_MODELS = {
  amberMature: '/assets/models/garden-premium/universal-trees/Tree02.glb',
  greenFormal: '/assets/models/garden-premium/universal-trees/Tree03.glb',
  redOak: '/assets/models/garden-premium/universal-trees/Tree07.glb',
  amberTall: '/assets/models/garden-premium/universal-trees/Tree01.glb',
} as const;
type AccentSpecies = keyof typeof ACCENT_MODELS;
const ACCENT_ROOT_EXPOSURE: Record<AccentSpecies, number> = {
  amberMature: 0.18,
  greenFormal: 0.2,
  redOak: 0.2,
  amberTall: 0.18,
};
const BOUNDARY_MODELS = [
  '/assets/models/garden-premium/universal-trees/Tree03.glb',
  '/assets/models/garden-premium/universal-trees/Tree08.glb',
] as const;

const boundaryInstances = [-1, 1].flatMap((side) =>
  [-40, -57.5, -75, -92.5, -110].map((z, row) => ({
    position: [side * 58, z] as const,
    rotation: side * 0.34 + row * 0.61,
    scale: 0.72 + (row % 3) * 0.06,
    species: row % BOUNDARY_MODELS.length,
  })),
);

/**
 * The dense layer is now a controlled frame: one specimen tree per quarter
 * and a boundary avenue outside the walkable lawns. No pots, rocks, free
 * flowers or multi-asset scenes are allowed to spill onto circulation.
 */
export function DenseGardenAssets() {
  const quality = useQualityProfile();
  const amberMature = useGLTF(ACCENT_MODELS.amberMature);
  const greenFormal = useGLTF(ACCENT_MODELS.greenFormal);
  const redOak = useGLTF(ACCENT_MODELS.redOak);
  const amberTall = useGLTF(ACCENT_MODELS.amberTall);
  const boundaryA = useGLTF(BOUNDARY_MODELS[0]);
  const boundaryB = useGLTF(BOUNDARY_MODELS[1]);

  const accentScenes = useMemo<Record<AccentSpecies, typeof amberMature.scene>>(() => ({
    amberMature: amberMature.scene,
    greenFormal: greenFormal.scene,
    redOak: redOak.scene,
    amberTall: amberTall.scene,
  }), [amberMature.scene, greenFormal.scene, redOak.scene, amberTall.scene]);
  const accentParts = useMemo(() => Object.fromEntries(
    Object.entries(accentScenes).map(([species, scene]) => {
      const parts = extractInstanceGroup(scene, undefined, lodNamePredicate(0));
      parts.forEach(({ material }) => prepareFoliageMaterial(material as MeshStandardMaterial));
      return [species, parts];
    }),
  ) as Record<AccentSpecies, ReturnType<typeof extractInstanceGroup>>, [accentScenes]);
  const boundaryParts = useMemo(() => [boundaryA.scene, boundaryB.scene].map((scene) => {
    const parts = extractInstanceGroup(scene, undefined, lodNamePredicate(1));
    parts.forEach(({ material }) => prepareFoliageMaterial(material as MeshStandardMaterial));
    return parts;
  }), [boundaryA.scene, boundaryB.scene]);

  useEffect(() => () => {
    Object.values(accentParts).flat().forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
    boundaryParts.flat().forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
  }, [accentParts, boundaryParts]);

  // One trunk collider per accent specimen and per boundary-avenue tree, sized
  // from the authored geometry so the walker stops at the bark, not the canopy.
  const trunkColliders = useMemo(() => {
    const specs: { key: string; position: [number, number, number]; radius: number }[] = [];
    for (const species of Object.keys(ACCENT_MODELS) as AccentSpecies[]) {
      const modelRadius = trunkFootprintRadius(accentParts[species]);
      COMPOSED_ACCENT_TREES.filter((tree) => tree.species === species).forEach((tree, index) => {
        specs.push({
          key: `accent-${species}-${index}`,
          position: [tree.position[0], TRUNK_COLLIDER_HALF_HEIGHT, tree.position[1]],
          radius: trunkColliderRadius(modelRadius, tree.scale),
        });
      });
    }
    boundaryParts.forEach((parts, species) => {
      const modelRadius = trunkFootprintRadius(parts);
      boundaryInstances.filter((item) => item.species === species).forEach((item, index) => {
        specs.push({
          key: `boundary-${species}-${index}`,
          position: [item.position[0], TRUNK_COLLIDER_HALF_HEIGHT, item.position[1]],
          radius: trunkColliderRadius(modelRadius, item.scale),
        });
      });
    });
    return specs;
  }, [accentParts, boundaryParts]);

  return (
    <group name="formal-charbagh-tree-frame">
      {(Object.keys(ACCENT_MODELS) as AccentSpecies[]).flatMap((species) => {
        const trees = COMPOSED_ACCENT_TREES.filter((tree) => tree.species === species);
        return accentParts[species].map((part, partIndex) => (
          <CulledInstances key={`accent-${species}-${partIndex}`} range={trees.length}
            castShadow={quality.name === 'high'} receiveShadow>
            <primitive object={part.geometry} attach="geometry" />
            <primitive object={part.material} attach="material" />
            {trees.map((tree, index) => (
              <Instance key={index} position={[
                tree.position[0],
                treePlantedY(accentScenes[species], tree.scale, ACCENT_ROOT_EXPOSURE[species]),
                tree.position[1],
              ]}
                rotation={[0, tree.rotation, 0]} scale={tree.scale} />
            ))}
          </CulledInstances>
        ));
      })}
      {boundaryParts.flatMap((parts, species) => parts.map((part, partIndex) => {
        const subset = boundaryInstances.filter((item) => item.species === species);
        return (
          <CulledInstances key={`boundary-${species}-${partIndex}`} range={subset.length}
            castShadow={false} receiveShadow>
            <primitive object={part.geometry} attach="geometry" />
            <primitive object={part.material} attach="material" />
            {subset.map((item, index) => (
              <Instance key={index} position={[
                item.position[0],
                treePlantedY(
                  species === 0 ? boundaryA.scene : boundaryB.scene,
                  item.scale,
                  species === 0 ? 0.2 : 0.18,
                ),
                item.position[1],
              ]}
                rotation={[0, item.rotation, 0]} scale={item.scale} />
            ))}
          </CulledInstances>
        );
      }))}
      <RigidBody type="fixed" colliders={false} name="formal-charbagh-tree-trunks">
        {trunkColliders.map((trunk) => (
          <CylinderCollider key={trunk.key} args={[TRUNK_COLLIDER_HALF_HEIGHT, trunk.radius]} position={trunk.position} />
        ))}
      </RigidBody>
    </group>
  );
}

Object.values(ACCENT_MODELS).forEach((url) => useGLTF.preload(url));
BOUNDARY_MODELS.forEach((url) => useGLTF.preload(url));
