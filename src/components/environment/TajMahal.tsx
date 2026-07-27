import { useEffect, useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import {
  Box3,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import { TAJ_PRESENTATION_FOOTPRINT } from '@constants/tajPlacement';

const MODEL_URL = '/assets/models/taj-premium/tajmahal.glb';
const CORRECTED_TOMB_TEXTURE = '/assets/textures/taj-tomb-corrected.webp';
const ARCHITECTURAL_BASE_INSET = 0;
/**
 * High-detail production Taj. Authored textures and material separation are
 * preserved. Phase 9B applies a conservative, restoration-minded marble tune:
 * a touch more polished-marble luster (env response) and a slightly tighter
 * roughness range for sheen — no albedo change, no dirt, no discoloration
 * (heritage, not ruin). A tiled detail-normal was trialled and reverted: it
 * forced a distinct shader permutation on every Taj sub-material (inflating the
 * program count on the software renderer) for a barely-visible gain. Real
 * inlay (pietra dura) and jali relief are geometry/authoring work deferred to
 * Phase 9C.
 */
export function TajMahal() {
  const gltf = useGLTF(MODEL_URL);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const correctedTombSource = useTexture(CORRECTED_TOMB_TEXTURE);
  const correctedTombTexture = useMemo(() => {
    const texture = correctedTombSource.clone();
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    texture.needsUpdate = true;
    return texture;
  }, [correctedTombSource, maxAnisotropy]);
  useEffect(() => () => correctedTombTexture.dispose(), [correctedTombTexture]);

  const prepared = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const bounds = new Box3().setFromObject(scene);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = TAJ_PRESENTATION_FOOTPRINT / Math.max(size.x, size.z);

    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const preparedMaterials = materials.map((sourceMaterial) => {
        const material = sourceMaterial.clone();
        if (material instanceof MeshStandardMaterial) {
          const isTombShell = mesh.name.includes('TOMB') || sourceMaterial.name.includes('TOMB_SHADER');
          if (isTombShell) {
            material.map = correctedTombTexture;
            material.color.set('#ffffff');
          }
          material.roughness = Math.min(0.55, Math.max(0.26, material.roughness));
          material.metalness = Math.min(0.03, material.metalness);
          material.envMapIntensity = 0.92;
          // The Sketchfab export marks every architectural shell double-sided.
          // From close flank angles that exposes atlas-background backfaces as
          // a large brown block inside the mausoleum.
          material.side = FrontSide;
          // The GLB textures ship at the default anisotropy of 1, so the dado
          // arch panels smear and stretch at grazing angles down the walls.
          // Match the crisp anisotropic filtering used across the greybox.
          for (const texture of [
            material.map,
            material.normalMap,
            material.roughnessMap,
            material.metalnessMap,
            material.aoMap,
            material.emissiveMap,
          ] as (Texture | null)[]) {
            if (texture && texture.anisotropy !== maxAnisotropy) {
              texture.anisotropy = maxAnisotropy;
              texture.needsUpdate = true;
            }
          }
        }
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? preparedMaterials : preparedMaterials[0];
    });

    return { scene, scale, offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number] };
  }, [correctedTombTexture, gltf.scene, maxAnisotropy]);

  return (
    <group position={[0, -ARCHITECTURAL_BASE_INSET, 0]} scale={prepared.scale}>
      <group position={prepared.offset}>
        <primitive object={prepared.scene} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload(CORRECTED_TOMB_TEXTURE);
