import { DoubleSide, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';

/**
 * Phase 10B foliage material pipeline.
 *
 * Every authored plant in `garden-premium/` is a texture cut-out: the leaf mesh
 * is a set of cards and the leaf *shape* lives in the base-colour texture's
 * alpha. Roughly half of them ship that as glTF `BLEND` rather than `MASK`, and
 * the previous `prepareModel` then forced `depthWrite = true` on them — an
 * alpha-blended card that writes depth occludes every card drawn after it, so
 * canopies thinned out and the hero trees read as half-dead.
 *
 * Blending is the wrong tool regardless: foliage cut-outs want alpha *testing*,
 * which is order-independent, writes depth honestly, and casts a correct shadow.
 * This converts them, and makes sure leaf cards are double-sided so the far side
 * of a canopy is not simply missing.
 */
const FOLIAGE_ALPHA_TEST = 0.42;

/** Stand-in for authored pots left at pure black with no texture (see `prepareFoliageMaterial`). */
const TERRACOTTA = 0x8a5236;

export function prepareFoliageMaterial(material: MeshStandardMaterial): void {
  if (material.transparent && material.map) {
    material.transparent = false;
    material.alphaTest = FOLIAGE_ALPHA_TEST;
    material.depthWrite = true;
  }

  // Cut-outs of any kind (converted above or already authored as MASK) need both
  // faces — a single-sided leaf card is invisible from behind, which reads as a
  // canopy with holes punched through it.
  if (material.alphaTest > 0) material.side = DoubleSide;

  // An untextured, pure-black material is an export artifact, not an art choice:
  // `office-plants.glb` ships its pot that way and it rendered as a black box in
  // the garden. Nothing in a Mughal garden is pure black.
  if (!material.map && material.color.getHex() === 0x000000) {
    material.color.setHex(TERRACOTTA);
    material.roughness = Math.max(material.roughness, 0.85);
    material.metalness = 0;
  }

  material.needsUpdate = true;
}

/** Applies the foliage pipeline and shadow flags across a loaded GLTF scene. */
export function prepareVegetationScene(scene: Object3D, shadows: boolean): void {
  scene.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => prepareFoliageMaterial(material as MeshStandardMaterial));
  });
}
