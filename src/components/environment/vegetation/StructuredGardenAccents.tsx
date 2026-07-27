import { useEffect, useMemo } from 'react';
import { Clone, useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Object3D } from 'three';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { prepareVegetationScene } from '@core/vegetation/foliageMaterials';
import {
  COMPOSED_LUPINE_INSTANCES,
  COMPOSED_MEADOW_INSTANCES,
} from '@core/vegetation/composition';
import { GARDEN_SURFACE_Y } from './grounding';

const MEADOW_MODEL = '/assets/models/garden-premium/plants-scene.glb';
const LUPINE_MODEL = '/assets/models/garden-premium/lupines.glb';

function placementFor(object: Object3D, scale: number, x: number, z: number) {
  object.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(object);
  const center = bounds.getCenter(new Vector3());
  return [
    x - center.x * scale,
    GARDEN_SURFACE_Y - bounds.min.y * scale,
    z - center.z * scale,
  ] as const;
}

/**
 * High-detail plants are used as repeated landscape modules, not scattered
 * props: one meadow ribbon between each pair of tree rows and one restrained
 * lupine cluster per parterre.
 */
export function StructuredGardenAccents() {
  const quality = useQualityProfile();
  const meadow = useGLTF(MEADOW_MODEL);
  const lupines = useGLTF(LUPINE_MODEL);

  useEffect(() => {
    prepareVegetationScene(meadow.scene, false);
    prepareVegetationScene(lupines.scene, quality.name === 'high');
  }, [lupines.scene, meadow.scene, quality.name]);

  const meadowInstances = useMemo(
    () => quality.name === 'low'
      ? COMPOSED_MEADOW_INSTANCES.filter((_, index) => index % 2 === 0)
      : COMPOSED_MEADOW_INSTANCES,
    [quality.name],
  );
  const lupineInstances = useMemo(
    () => quality.name === 'low'
      ? COMPOSED_LUPINE_INSTANCES.filter((_, index) => index % 2 === 0)
      : COMPOSED_LUPINE_INSTANCES,
    [quality.name],
  );

  return (
    <group name="structured-charbagh-plant-accents">
      {meadowInstances.map((instance, index) => (
        <Clone
          key={`meadow-${index}`}
          object={meadow.scene}
          position={placementFor(
            meadow.scene,
            instance.scale,
            instance.position[0],
            instance.position[2],
          )}
          rotation={[0, instance.rotationY, 0]}
          scale={instance.scale}
        />
      ))}
      {lupineInstances.map((instance, index) => (
        <Clone
          key={`lupine-${index}`}
          object={lupines.scene}
          position={placementFor(
            lupines.scene,
            instance.scale,
            instance.position[0],
            instance.position[2],
          )}
          rotation={[0, instance.rotationY, 0]}
          scale={instance.scale}
        />
      ))}
    </group>
  );
}

useGLTF.preload(MEADOW_MODEL);
useGLTF.preload(LUPINE_MODEL);
