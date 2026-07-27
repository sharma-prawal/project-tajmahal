import { useEffect, useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import type { MeshStandardMaterial } from 'three';
import { AXIS_LAYOUT, BOUNDARY_WALL, OOB_BOUNDS } from '@constants/world';
import { makeArchMaterial, tileRepeat, useArchTextureSets } from '@core/environment/useArchitecturalMaterials';

const depth = Math.abs(AXIS_LAYOUT.mausoleumEnd - AXIS_LAYOUT.forecourtStart) + 10;
const centerZ = (AXIS_LAYOUT.mausoleumEnd + AXIS_LAYOUT.forecourtStart) / 2;
const crossWidth = OOB_BOUNDS.maxX - OOB_BOUNDS.minX;
const capHeight = 0.12;
const capOverhang = 0.1;

interface WallSpec {
  position: [number, number, number];
  size: [number, number, number]; // width(x), height(y), depth(z)
}

const WALLS: WallSpec[] = [
  { position: [OOB_BOUNDS.minX, BOUNDARY_WALL.height / 2, centerZ], size: [BOUNDARY_WALL.thickness, BOUNDARY_WALL.height, depth] },
  { position: [OOB_BOUNDS.maxX, BOUNDARY_WALL.height / 2, centerZ], size: [BOUNDARY_WALL.thickness, BOUNDARY_WALL.height, depth] },
  { position: [0, BOUNDARY_WALL.height / 2, AXIS_LAYOUT.forecourtStart + 6], size: [crossWidth, BOUNDARY_WALL.height, BOUNDARY_WALL.thickness] },
  { position: [0, BOUNDARY_WALL.height / 2, AXIS_LAYOUT.mausoleumEnd - 4], size: [crossWidth, BOUNDARY_WALL.height, BOUNDARY_WALL.thickness] },
];

function disposeMaterial(material: MeshStandardMaterial) {
  material.map?.dispose();
  material.normalMap?.dispose();
  material.roughnessMap?.dispose();
  material.dispose();
}

/**
 * Perimeter walls (Part 3). Phase 9B: the flat solid-colour sandstone is
 * replaced by a believable dressed **sandstone (travertine)** PBR material —
 * warm, matte, fine relief, never noisy — with per-wall tiling so texel
 * density stays constant on the long side walls and the shorter end walls
 * alike, plus a polished **marble cap** trim. `OOB_BOUNDS` recovery remains the
 * safety net behind the visible wall.
 */
export function Boundaries() {
  const { marble, sandstone } = useArchTextureSets();
  const built = useMemo(() => {
    const wall = WALLS.map((spec) => {
      const faceWidth = Math.max(spec.size[0], spec.size[2]);
      return makeArchMaterial(sandstone, {
        tint: '#c3ad83',
        // ~2.8 m tile → believable dressed-stone grain; non-directional scan, so
        // no plank/bark banding regardless of wall length. Anisotropy keeps it
        // crisp along the long grazing runs.
        repeat: tileRepeat(faceWidth, spec.size[1], 2.8),
        anisotropy: 8,
        roughness: 0.92,
        normalScale: 0.7,
        envMapIntensity: 0.3,
      });
    });
    const cap = WALLS.map((spec) => {
      const faceWidth = Math.max(spec.size[0], spec.size[2]) + capOverhang;
      return makeArchMaterial(marble, {
        repeat: tileRepeat(faceWidth, spec.size[2] + capOverhang, 3),
        anisotropy: 8,
        roughness: 0.42,
        normalScale: 0.5,
        envMapIntensity: 0.9,
      });
    });
    return { wall, cap };
  }, [marble, sandstone]);

  useEffect(() => () => {
    built.wall.forEach(disposeMaterial);
    built.cap.forEach(disposeMaterial);
  }, [built]);

  return (
    <>
      {WALLS.map((wall, i) => (
        <group key={i}>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={wall.position} receiveShadow castShadow material={built.wall[i]}>
              <boxGeometry args={wall.size} />
            </mesh>
          </RigidBody>
          <mesh
            position={[wall.position[0], BOUNDARY_WALL.height + capHeight / 2, wall.position[2]]}
            receiveShadow
            material={built.cap[i]}
          >
            <boxGeometry args={[wall.size[0] + capOverhang, capHeight, wall.size[2] + capOverhang]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
