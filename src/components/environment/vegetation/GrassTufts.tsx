import { useEffect, useMemo } from 'react';
import { DoubleSide } from 'three';
import { Instance } from '@react-three/drei';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { placeVegetation } from '@core/vegetation/placement';
import { CIRCULATION_EXCLUSIONS } from '@core/vegetation/zones';
import { VEGETATION_MATERIAL, VEGETATION_SEED } from '@constants/vegetation';
import { createGrassTuftGeometry } from '@core/vegetation/productionGeometry';
import { CulledInstances } from './CulledInstances';
import { WindMaterial } from '@core/atmosphere/WindMaterial';
import { COMPOSED_GRASS_PATCH_BOUNDS } from '@core/vegetation/composition';

export function GrassTufts() {
  const quality = useQualityProfile();
  const geometry = useMemo(() => createGrassTuftGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const all = useMemo(() => COMPOSED_GRASS_PATCH_BOUNDS.flatMap((bounds, i) =>
    placeVegetation({
      bounds,
      cellSize: 1.15,
      jitter: 0.5,
      exclusions: CIRCULATION_EXCLUSIONS,
      skipProbability: 0.22,
      scaleRange: [0.58, 0.92],
      seed: VEGETATION_SEED.grass + i,
    }),
  ), []);
  const instances = quality.name === 'low' ? all.filter((_, i) => i % 4 === 0) : quality.name === 'medium' ? all.filter((_, i) => i % 2 === 0) : all;
  return <CulledInstances range={instances.length} receiveShadow>
    <primitive object={geometry} attach="geometry" />
    <WindMaterial {...VEGETATION_MATERIAL.foliageDark} side={DoubleSide} familyStrength={0.72} maxHeight={0.38} />
    {instances.map((instance, i) => <Instance key={i} position={instance.position} rotation={[0, instance.rotationY, 0]} scale={instance.scale} />)}
  </CulledInstances>;
}
