import { useEffect, useMemo } from 'react';
import { Instance, useGLTF } from '@react-three/drei';
import type { MeshStandardMaterial } from 'three';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { extractInstanceSources } from '@core/vegetation/instancedGltf';
import { prepareFoliageMaterial } from '@core/vegetation/foliageMaterials';
import { CulledInstances } from './CulledInstances';
import { COMPOSED_SHRUB_INSTANCES } from '@core/vegetation/composition';

const SHRUB_URL = '/assets/models/garden-premium/shrub-ornamental.glb';

/**
 * Four genuinely different scanned shrubs, not one bush repeated. Phase 4E's
 * shrubs were three merged icosahedron lobes in flat green — from a metre away
 * they read as painted rocks. These are CC0 photoscans at ~2.2 k triangles
 * each, still one `InstancedMesh` draw call per variant (Objective 5).
 */
const SHRUB_VARIANTS = ['shrub_02_a', 'shrub_02_b', 'shrub_02_c', 'shrub_02_d'] as const;

export function Shrubs() {
  const quality = useQualityProfile();
  const shrubs = useGLTF(SHRUB_URL);

  const sources = useMemo(() => {
    const extracted = extractInstanceSources(shrubs.scene, SHRUB_VARIANTS);
    extracted.forEach(({ material }) => prepareFoliageMaterial(material as MeshStandardMaterial));
    return extracted;
  }, [shrubs.scene]);
  useEffect(() => () => sources.forEach(({ geometry, material }) => {
    geometry.dispose();
    material.dispose();
  }), [sources]);

  return (
    <group name="production-shrubs">
      {sources.map((source, variant) => {
        const subset = COMPOSED_SHRUB_INSTANCES.filter((_, index) => index % sources.length === variant);
        if (subset.length === 0) return null;
        return (
          <CulledInstances key={variant} range={subset.length} castShadow={quality.name === 'high'} receiveShadow>
            <primitive object={source.geometry} attach="geometry" />
            <primitive object={source.material} attach="material" />
            {subset.map((instance, index) => (
              <Instance key={index} position={instance.position} rotation={[0, instance.rotationY, 0]} scale={instance.scale} />
            ))}
          </CulledInstances>
        );
      })}
    </group>
  );
}

useGLTF.preload(SHRUB_URL);
