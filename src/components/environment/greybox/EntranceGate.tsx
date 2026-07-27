import { useEffect, useMemo } from 'react';
import { Clone, useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { Box3, Material, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { AXIS_LAYOUT, ENTRANCE_GATE } from '@constants/world';
import { makeArchMaterial, useArchTextureSets } from '@core/environment/useArchitecturalMaterials';

const INDIA_GATE_URL = '/assets/models/architecture/india-gate.glb';
const gateZ = (AXIS_LAYOUT.gateStart + AXIS_LAYOUT.gateEnd) / 2;
const pillarWidth = (ENTRANCE_GATE.width - ENTRANCE_GATE.openingWidth) / 2;
const pillarX = ENTRANCE_GATE.openingWidth / 2 + pillarWidth / 2;
const lintelHeight = ENTRANCE_GATE.height - ENTRANCE_GATE.openingHeight;

function isGroundMaterial(material: Material | Material[]) {
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((entry) => entry.name.toLowerCase() === 'ground');
}

/** The gate GLB ships flat solid-colour slots ("Material_1" warm sandstone,
 *  "Material_2" dark red) with no maps. Reassign them to the shared dressed
 *  sandstone / red-sandstone PBR so the monument gains surface breakup, edge
 *  relief and AO in the same stone language as the rest of the complex. */
function isRedSlot(material: Material) {
  return material.name === 'Material_2';
}

export function EntranceGate() {
  const { scene } = useGLTF(INDIA_GATE_URL);
  const { sandstone } = useArchTextureSets();
  // Gate-specific calibration: the india-gate UV0 maps ~0..1 across the whole
  // monument, so a repeat of ~9 gives believable ~2 m dressed-stone courses on
  // the piers (Travertine's banding is gone — this is the non-directional
  // sandstone scan). Red base blocks share the scan, warmly tinted.
  const mats = useMemo(() => ({
    sandstone: makeArchMaterial(sandstone, { tint: '#c9b489', repeat: 9, anisotropy: 8, roughness: 0.9, normalScale: 0.75, envMapIntensity: 0.3 }),
    red: makeArchMaterial(sandstone, { tint: '#a05e3d', repeat: 9, anisotropy: 8, roughness: 0.92, normalScale: 0.75, envMapIntensity: 0.28 }),
  }), [sandstone]);
  useEffect(() => () => {
    for (const m of [mats.sandstone, mats.red]) { m.map?.dispose(); m.normalMap?.dispose(); m.roughnessMap?.dispose(); m.dispose(); }
  }, [mats]);

  const gate = useMemo(() => {
    const prepared = scene.clone(true);
    const authoringGround: Mesh[] = [];
    prepared.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (isGroundMaterial(object.material)) {
        authoringGround.push(object);
        return;
      }
      const assign = (source: Material) => (isRedSlot(source) ? mats.red : mats.sandstone);
      object.material = Array.isArray(object.material) ? object.material.map(assign) : assign(object.material as MeshStandardMaterial);
    });
    authoringGround.forEach((mesh) => mesh.removeFromParent());
    prepared.updateMatrixWorld(true);

    const bounds = new Box3().setFromObject(prepared);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = Math.min(
      ENTRANCE_GATE.width / Math.max(size.x, 0.001),
      ENTRANCE_GATE.height / Math.max(size.y, 0.001),
      ENTRANCE_GATE.depth / Math.max(size.z, 0.001),
    );

    return {
      object: prepared,
      scale,
      offset: [
        -center.x * scale,
        -bounds.min.y * scale,
        -center.z * scale,
      ] as [number, number, number],
    };
  }, [scene, mats]);

  return <group position={[0, 0, gateZ]}>
    <Clone object={gate.object} position={gate.offset} scale={gate.scale} />
    {[-1, 1].map((side) => <RigidBody key={side} type="fixed" colliders="cuboid"><mesh position={[side * pillarX, ENTRANCE_GATE.openingHeight / 2, 0]} visible={false}><boxGeometry args={[pillarWidth, ENTRANCE_GATE.openingHeight, ENTRANCE_GATE.depth]} /></mesh></RigidBody>)}
    <RigidBody type="fixed" colliders="cuboid"><mesh position={[0, ENTRANCE_GATE.openingHeight + lintelHeight / 2, 0]} visible={false}><boxGeometry args={[ENTRANCE_GATE.width, lintelHeight, ENTRANCE_GATE.depth]} /></mesh></RigidBody>
  </group>;
}

useGLTF.preload(INDIA_GATE_URL);
