import { useMemo } from 'react';
import { Clone, useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import {
  Box3,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { AXIS_LAYOUT, PAVILION } from '@constants/world';

const GAZEBO_URL = '/assets/models/pavilions/gazebo.glb';
const pavilionZ = (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2;
const postSize = 0.6;
const roofThickness = 0.5;
const targetHeight = PAVILION.height + 2.35;

interface PavilionPlacement {
  offset: [number, number, number];
  scale: number;
}

function useGazebo(): {
  model: Group;
  placement: PavilionPlacement;
} {
  const { scene } = useGLTF(GAZEBO_URL);

  return useMemo(() => {
    const model = scene.clone(true);
    model.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        // The gazebo GLB ships a PBR material with metalness = 1.0 (renders
        // near-black) AND a *dark* authored albedo that reads as varnished wood.
        // 9B fixed the metalness; 9B.1 also drops the dark albedo map and drives
        // a light dressed-stone colour, while KEEPING the authored normal map —
        // so the carved balustrade/column relief survives but the chhatri now
        // reads as pale carved marble/limestone belonging to the complex. No new
        // texture is introduced; this reuses the model's own surface detail.
        const restoreStoneMaterial = (source: Material) => {
          const material = source.clone();
          if (material instanceof MeshStandardMaterial) {
            material.name = `${source.name}-stone`;
            material.color.set('#e6dcc6');
            material.metalness = 0;
            material.roughness = 0.62;
            material.emissive.set('#000000');
            material.emissiveIntensity = 0;
            material.emissiveMap = null;
            material.map = null; // drop the dark wood-like authored albedo
            material.envMapIntensity = 0.6;
            material.aoMapIntensity = 1;
            material.needsUpdate = true;
          }
          return material;
        };
        object.material = Array.isArray(object.material)
          ? object.material.map(restoreStoneMaterial)
          : restoreStoneMaterial(object.material);
      }
    });

    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = Math.min(
      PAVILION.width / Math.max(size.x, 0.001),
      targetHeight / Math.max(size.y, 0.001),
      PAVILION.depth / Math.max(size.z, 0.001),
    );

    return {
      model,
      placement: {
        scale,
        offset: [
          -center.x * scale,
          -bounds.min.y * scale,
          -center.z * scale,
        ] as [number, number, number],
      },
    };
  }, [scene]);
}

function Pavilion({
  x,
  model,
  placement,
}: {
  x: number;
  model: Group;
  placement: PavilionPlacement;
}) {
  const halfW = PAVILION.width / 2 - 1;
  const halfD = PAVILION.depth / 2 - 1;

  return (
    <group position={[x, 0, pavilionZ]}>
      <Clone
        object={model}
        position={placement.offset}
        scale={placement.scale}
        castShadow
        receiveShadow
      />
      {[
        [-halfW, -halfD],
        [halfW, -halfD],
        [-halfW, halfD],
        [halfW, halfD],
      ].map(([px, pz], index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid">
          <mesh position={[px, PAVILION.height / 2, pz]} visible={false}>
            <boxGeometry args={[postSize, PAVILION.height, postSize]} />
          </mesh>
        </RigidBody>
      ))}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          position={[0, PAVILION.height + roofThickness / 2, 0]}
          visible={false}
        >
          <boxGeometry
            args={[PAVILION.width, roofThickness, PAVILION.depth]}
          />
        </mesh>
      </RigidBody>
    </group>
  );
}

export function Pavilions() {
  const { model, placement } = useGazebo();

  return (
    <>
      <Pavilion
        x={-PAVILION.axisOffset}
        model={model}
        placement={placement}
      />
      <Pavilion
        x={PAVILION.axisOffset}
        model={model}
        placement={placement}
      />
    </>
  );
}

useGLTF.preload(GAZEBO_URL);
