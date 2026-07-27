import { useEffect, useMemo } from 'react';
import { Instance, useGLTF } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import type { MeshStandardMaterial, Object3D } from 'three';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { prepareFoliageMaterial } from '@core/vegetation/foliageMaterials';
import { extractInstanceGroup, lodNamePredicate } from '@core/vegetation/instancedGltf';
import { COMPOSED_TREE_INSTANCES, TREE_ANCHOR_COUNT } from '@core/vegetation/composition';
import { CulledInstances } from './CulledInstances';
import { treePlantedY, trunkFootprintRadius } from './grounding';

/**
 * Trunk colliders are a shallow cylinder centred on each planted trunk. The
 * radius is measured from the authored geometry (`trunkFootprintRadius`) so it
 * hugs the bark, and the height only has to cover the walker's capsule — the
 * canopy sits well above head height, so nothing blocks a path the player can
 * actually walk under. Clamped so a giant trunk cannot balloon into the lawn
 * and a slender one still stops the walker.
 */
const TRUNK_COLLIDER_HALF_HEIGHT = 1.1;
const TRUNK_COLLIDER_MIN_RADIUS = 0.22;
const TRUNK_COLLIDER_MAX_RADIUS = 0.85;

function trunkColliderRadius(modelRadius: number, scale: number) {
  return Math.min(TRUNK_COLLIDER_MAX_RADIUS, Math.max(TRUNK_COLLIDER_MIN_RADIUS, modelRadius * scale));
}


/**
 * Phase 10D — the garden's mid-ground tree layer.
 *
 * `COMPOSED_TREE_INSTANCES` is 10 authored north-west anchors mirrored into a
 * Charbagh with a per-quadrant drift and scale bias. It has existed since
 * Phase 9D and **nothing has ever drawn it**: this component used to build
 * icosahedron lobes on a cylinder trunk, was never mounted, and Phase 10B
 * correctly marked that geometry REMOVE rather than revive blobs — but the
 * composition got written off along with it. Phase 10C then adopted eight real
 * photoscanned species with authored LODs, so the asset the composition was
 * waiting for now exists. This connects them.
 *
 * Species are assigned by distance from the central axis, which is the actual
 * landscape-architecture decision here rather than a cosmetic one:
 *
 * - **Outer frame** (|x| >= 40) — the broadest canopies (Tree08 at 8.6 m,
 *   Tree03 at 7.4 m). They close the garden's edges and read as its far wall.
 * - **Middle** (|x| 24-39) — Tree09 at 6.5 m, the quiet connective band: a
 *   clear step down in mass from the heroes, in a canopy colour that
 *   harmonises with them instead of introducing a fourth note.
 * - **Beside the axis** (|x| <= 20) — Tree04, the pack's only columnar
 *   silhouette (6.1 m tall, 4.7 m spread), in the cypress role: height exactly
 *   where the player walks, without putting canopy mass across the sightline
 *   to the Taj.
 *
 * No anchor is nearer than 17 m to the 3.5 m central path, so the authored set
 * already protects that sightline; this only has to avoid spoiling it.
 *
 * The first build of this layer used Tree05 for the middle band and LOD1
 * throughout, and the capture showed why both were wrong: Tree05's eucalyptus
 * bark measures avg RGB (186, 181, 134) across almost no tonal range, so at
 * 10 m the trunk reads as unpainted clay — and LOD1 at that distance is a
 * handful of oversized leaf cards. This layer is *walked through*, not looked
 * at, so it gets a dark-barked species and the authored LOD0.
 */
const AVENUE_SPECIES = ['greenFrame', 'greenBroad', 'amberCompact', 'amberTall', 'amberMature', 'red', 'columnar'] as const;
type AvenueSpecies = (typeof AVENUE_SPECIES)[number];

const SPECIES_MODELS: Record<AvenueSpecies, string> = {
  greenFrame: '/assets/models/garden-premium/universal-trees/Tree08.glb', // 8.6 m, narrow Z profile
  greenBroad: '/assets/models/garden-premium/universal-trees/Tree03.glb', // 7.4 m, broad
  amberCompact: '/assets/models/garden-premium/universal-trees/Tree09.glb', // 6.5 m, orange oak
  amberTall: '/assets/models/garden-premium/universal-trees/Tree01.glb', // 10 m, autumn orange
  amberMature: '/assets/models/garden-premium/universal-trees/Tree02.glb', // 9.3 m, mature autumn orange
  red: '/assets/models/garden-premium/universal-trees/Tree07.glb', // 7.6 m, autumn red
  columnar: '/assets/models/garden-premium/universal-trees/Tree04.glb', // 6.1 m, columnar conifer
};

const VISIBLE_ROOT_FRACTION: Record<AvenueSpecies, number> = {
  greenFrame: 0.18,
  greenBroad: 0.2,
  amberCompact: 0.22,
  amberTall: 0.18,
  amberMature: 0.18,
  red: 0.2,
  columnar: 0.3,
};

/**
 * Each row is one authored anchor and each column NW/NE/SW/SE. This preserves
 * the formal grid while giving the quarters distinct canopy themes: amber,
 * deep green, red/copper and a restrained heritage mix.
 */
const SPECIES_BY_ANCHOR_AND_QUADRANT: readonly (readonly AvenueSpecies[])[] = [
  ['amberTall', 'red', 'amberMature', 'greenFrame'],
  ['greenFrame', 'amberMature', 'red', 'amberTall'],
  ['amberCompact', 'greenBroad', 'amberTall', 'red'],
  ['red', 'amberTall', 'greenBroad', 'amberCompact'],
  ['columnar', 'columnar', 'columnar', 'columnar'],
  ['columnar', 'amberCompact', 'columnar', 'amberCompact'],
  ['columnar', 'columnar', 'columnar', 'columnar'],
];

/**
 * Every species in this layer uses the authored LOD0.
 *
 * The garden's quadrants are walkable, so "mid-ground" here means 10-25 m, not
 * 60 m — and the whole layer at LOD0 costs ~97 k triangles, against the 1.67 M
 * Phase 10C removed. There was never a budget reason to spend quality here.
 */
const AVENUE_LOD = 0;

export function Trees() {
  const quality = useQualityProfile();
  const greenFrame = useGLTF(SPECIES_MODELS.greenFrame);
  const greenBroad = useGLTF(SPECIES_MODELS.greenBroad);
  const amberCompact = useGLTF(SPECIES_MODELS.amberCompact);
  const amberTall = useGLTF(SPECIES_MODELS.amberTall);
  const amberMature = useGLTF(SPECIES_MODELS.amberMature);
  const red = useGLTF(SPECIES_MODELS.red);
  const columnar = useGLTF(SPECIES_MODELS.columnar);

  // The same four URLs the backdrop layer loads, so `useGLTF`'s cache means no
  // extra download and no duplicated textures — the material clones below share
  // their maps by reference. Only the geometry differs, because this layer
  // draws a different authored LOD.
  const scenes = useMemo<Record<AvenueSpecies, Object3D>>(() => ({
    greenFrame: greenFrame.scene,
    greenBroad: greenBroad.scene,
    amberCompact: amberCompact.scene,
    amberTall: amberTall.scene,
    amberMature: amberMature.scene,
    red: red.scene,
    columnar: columnar.scene,
  }), [greenFrame.scene, greenBroad.scene, amberCompact.scene, amberTall.scene, amberMature.scene, red.scene, columnar.scene]);

  const partsBySpecies = useMemo(() => {
    const built = {} as Record<AvenueSpecies, ReturnType<typeof extractInstanceGroup>>;
    for (const species of AVENUE_SPECIES) {
      const parts = extractInstanceGroup(scenes[species], undefined, lodNamePredicate(AVENUE_LOD));
      parts.forEach(({ material }) => prepareFoliageMaterial(material as MeshStandardMaterial));
      built[species] = parts;
    }
    return built;
  }, [scenes]);

  useEffect(() => () => {
    for (const species of AVENUE_SPECIES) {
      partsBySpecies[species].forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
    }
  }, [partsBySpecies]);

  const instancesBySpecies = useMemo(() => {
    const grouped = {} as Record<AvenueSpecies, (typeof COMPOSED_TREE_INSTANCES)[number][]>;
    for (const species of AVENUE_SPECIES) grouped[species] = [];
    const perAnchor = COMPOSED_TREE_INSTANCES.length / TREE_ANCHOR_COUNT;
    COMPOSED_TREE_INSTANCES.forEach((instance, index) => {
      const anchor = Math.floor(index / perAnchor);
      const quadrant = index % perAnchor;
      grouped[SPECIES_BY_ANCHOR_AND_QUADRANT[anchor][quadrant]].push(instance);
    });
    return grouped;
  }, []);

  // Only the columnar trees beside the walkway cast: their shadow is the one
  // that actually falls where anyone is standing. Shadow-casting the whole
  // layer would spend the garden's shadow budget on silhouettes the player
  // reads against the sky rather than the ground.
  const shadows = quality.name === 'high';

  // One trunk collider per planted tree, sized from the same authored geometry
  // the layer draws so the walker is stopped at the bark, never at the canopy.
  const trunkColliders = useMemo(() => {
    const specs: { key: string; position: [number, number, number]; radius: number }[] = [];
    for (const species of AVENUE_SPECIES) {
      const modelRadius = trunkFootprintRadius(partsBySpecies[species]);
      instancesBySpecies[species].forEach((instance, index) => {
        specs.push({
          key: `${species}-${index}`,
          position: [instance.position[0], TRUNK_COLLIDER_HALF_HEIGHT, instance.position[2]],
          radius: trunkColliderRadius(modelRadius, instance.scale),
        });
      });
    }
    return specs;
  }, [partsBySpecies, instancesBySpecies]);

  return (
    <group name="garden-avenue-trees">
      {AVENUE_SPECIES.flatMap((species) => {
        const instances = instancesBySpecies[species];
        if (instances.length === 0) return [];
        return partsBySpecies[species].map((part, partIndex) => (
          <CulledInstances
            key={`avenue-${species}-${partIndex}`}
            range={instances.length}
            castShadow={shadows && species === 'columnar'}
            receiveShadow
          >
            <primitive object={part.geometry} attach="geometry" />
            <primitive object={part.material} attach="material" />
            {instances.map((instance, index) => (
              <Instance
                key={index}
                position={[
                  instance.position[0],
                  treePlantedY(scenes[species], instance.scale, VISIBLE_ROOT_FRACTION[species]),
                  instance.position[2],
                ]}
                rotation={[0, instance.rotationY, 0]}
                scale={instance.scale}
              />
            ))}
          </CulledInstances>
        ));
      })}
      <RigidBody type="fixed" colliders={false} name="garden-avenue-tree-trunks">
        {trunkColliders.map((trunk) => (
          <CylinderCollider key={trunk.key} args={[TRUNK_COLLIDER_HALF_HEIGHT, trunk.radius]} position={trunk.position} />
        ))}
      </RigidBody>
    </group>
  );
}

Object.values(SPECIES_MODELS).forEach((url) => useGLTF.preload(url));
