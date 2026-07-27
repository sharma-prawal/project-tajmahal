import { useEffect, useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { AXIS_LAYOUT, OOB_BOUNDS } from '@constants/world';
import { makeGroundMaterial, useGroundTextureSets } from '@core/environment/useGroundSurfaces';

const width = OOB_BOUNDS.maxX - OOB_BOUNDS.minX;
const depth = Math.abs(AXIS_LAYOUT.mausoleumEnd) + 40;
const centerZ = -depth / 2 + 20;
const BASE_TILE_METRES = 6;

/**
 * The shared, authoritative flat world surface + collider at y=0. Phase 9A
 * replaces the old cracked-clay scan (which read as a dried lakebed and
 * dominated the whole scene) with a calm, low-contrast **dry-earth** base
 * derived from the sandstone-dust set — desaturated, softened normal, large
 * tile — so it recedes behind the architecture. Most of it is then covered by
 * the authored `GroundZones` courts, lawns, and paving; this base only shows at
 * the quiet outer margins, exactly as a maintained garden's edges would look.
 */
export function Terrain() {
  const { sandstone } = useGroundTextureSets();
  const material = useMemo(
    () =>
      makeGroundMaterial(sandstone, {
        tint: '#8f8974',
        repeat: [width / BASE_TILE_METRES, depth / BASE_TILE_METRES],
        roughness: 1,
        normalScale: 0.45,
      }),
    [sandstone],
  );
  useEffect(() => () => {
    material.map?.dispose();
    material.normalMap?.dispose();
    material.roughnessMap?.dispose();
    material.dispose();
  }, [material]);

  return (
    <RigidBody type="fixed" colliders={false} friction={1}>
      <mesh position={[0, -0.05, centerZ]} receiveShadow material={material}>
        <boxGeometry args={[width, 0.1, depth]} />
      </mesh>
      <CuboidCollider
        args={[width / 2, 0.05, depth / 2]}
        position={[0, -0.05, centerZ]}
        friction={1}
      />
    </RigidBody>
  );
}
