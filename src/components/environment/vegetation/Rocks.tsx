import { useEffect, useMemo } from 'react';
import { Instance } from '@react-three/drei';
import { VEGETATION_MATERIAL } from '@constants/vegetation';
import { createRockGeometry } from '@core/vegetation/productionGeometry';
import { CulledInstances } from './CulledInstances';
import { COMPOSED_ROCK_INSTANCES } from '@core/vegetation/composition';

export function Rocks() {
  const all = COMPOSED_ROCK_INSTANCES;
  const geometries = useMemo(() => Array.from({ length: 6 }, (_, i) => createRockGeometry(i)), []);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return <group name="production-rocks">{geometries.map((geometry, variant) => {
    const subset = all.filter((_, index) => index % 6 === variant);
    return <CulledInstances key={variant} range={subset.length} receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial {...VEGETATION_MATERIAL.rock} />
      {subset.map((instance, i) => <Instance key={i} position={instance.position} rotation={[instance.rotationY * 0.08, instance.rotationY, instance.rotationY * 0.05]} scale={instance.scale} />)}
    </CulledInstances>;
  })}</group>;
}
