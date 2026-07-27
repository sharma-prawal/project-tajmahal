import { BufferAttribute, Float32BufferAttribute, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';

/**
 * Converts any normalized-integer attribute to plain float32.
 *
 * `KHR_mesh_quantization` geometry arrives as normalized Int16/Uint16, and
 * `BufferGeometry.applyMatrix4` writes transformed *float* values straight back
 * into that integer array — silently truncating the mesh to noise. Anything
 * that bakes a world transform into geometry has to de-quantize first.
 */
function dequantize(geometry: BufferGeometry): BufferGeometry {
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const typed = attribute as BufferAttribute;
    if (!typed.normalized && typed.array instanceof Float32Array) continue;
    const values = new Float32Array(typed.count * typed.itemSize);
    for (let i = 0; i < typed.count; i += 1) {
      for (let component = 0; component < typed.itemSize; component += 1) {
        values[i * typed.itemSize + component] = typed.getComponent(i, component);
      }
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, typed.itemSize));
  }
  return geometry;
}

export interface InstanceSource {
  /** World-baked, footprint-centred, sitting on y = 0 — ready to drive an `InstancedMesh`. */
  geometry: BufferGeometry;
  material: Material;
  /** Metres at scale 1 — the wind shader's falloff height and the layer's rank. */
  height: number;
}

/**
 * Turns one named node of a loaded GLTF into an instancing source.
 *
 * Authored plant packs lay their variants out side by side in one scene
 * (`shrub_02_a … _d`, `periwinkle_plant_01 … _06`), so each variant carries a
 * translation that would otherwise be baked into every instance. This flattens
 * the node's world transform into the geometry, then re-centres it on its own
 * XZ footprint and drops it to ground level, so instances place from their
 * base like any other planted asset.
 *
 * Returns `null` when the node is missing rather than throwing — a pack that
 * changes its node names should cost a missing plant, not a blank canvas.
 */
export function extractInstanceSource(scene: Object3D, nodeName: string): InstanceSource | null {
  const node = scene.getObjectByName(nodeName);
  if (!node) return null;
  const mesh = node as Mesh;
  if (!mesh.isMesh) return null;

  scene.updateMatrixWorld(true);
  const geometry = dequantize(mesh.geometry.clone());
  geometry.applyMatrix4(mesh.matrixWorld);

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!.clone();
  geometry.translate(
    -(bounds.min.x + bounds.max.x) / 2,
    -bounds.min.y,
    -(bounds.min.z + bounds.max.z) / 2,
  );
  geometry.computeBoundingSphere();

  // Cloned, not shared: an authored pack gives all its variants one material,
  // and R3F cannot `attach` the same object instance in more than one place.
  // Cloning is cheap — the texture maps stay shared by reference.
  const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

  return { geometry, material: source.clone(), height: bounds.max.y - bounds.min.y };
}

/**
 * Every mesh under one node, as instancing sources sharing a single origin.
 *
 * A scanned tree arrives as one node holding separate trunk / branch / leaf
 * primitives, each with its own material. They must be re-centred by the *same*
 * offset — centring each on its own footprint, as `extractInstanceSource` does
 * for standalone plants, would slide the canopy off the trunk.
 *
 * `namePredicate` filters which meshes count, before the shared bounds are
 * computed. The UniversalPack ships three authored LOD levels as sibling
 * meshes named e.g. `Tree01.LOD0` / `.LOD1` / `.LOD2` in one file — without a
 * filter, extracting the file would stack all three LODs on top of each other.
 */
export function extractInstanceGroup(
  scene: Object3D,
  nodeName?: string,
  namePredicate?: (name: string) => boolean,
): InstanceSource[] {
  const root = nodeName ? scene.getObjectByName(nodeName) : scene;
  if (!root) return [];
  scene.updateMatrixWorld(true);

  const meshes: Mesh[] = [];
  root.traverse((child) => {
    if ((child as Mesh).isMesh && (!namePredicate || namePredicate(child.name))) meshes.push(child as Mesh);
  });
  if (meshes.length === 0) return [];

  const geometries = meshes.map((mesh) => {
    const geometry = dequantize(mesh.geometry.clone());
    geometry.applyMatrix4(mesh.matrixWorld);
    geometry.computeBoundingBox();
    return geometry;
  });

  const bounds = geometries[0].boundingBox!.clone();
  for (const geometry of geometries.slice(1)) bounds.union(geometry.boundingBox!);
  const offset: [number, number, number] = [
    -(bounds.min.x + bounds.max.x) / 2,
    -bounds.min.y,
    -(bounds.min.z + bounds.max.z) / 2,
  ];

  return geometries.map((geometry, index) => {
    geometry.translate(...offset);
    geometry.computeBoundingSphere();
    const source = meshes[index].material;
    return {
      geometry,
      material: (Array.isArray(source) ? source[0] : source).clone(),
      height: bounds.max.y - bounds.min.y,
    };
  });
}

/** `extractInstanceSource` across a variant list, dropping any node the pack no longer ships. */
export function extractInstanceSources(scene: Object3D, nodeNames: readonly string[]): InstanceSource[] {
  return nodeNames
    .map((name) => extractInstanceSource(scene, name))
    .filter((source): source is InstanceSource => source !== null);
}

/**
 * Matches a mesh name against an authored LOD level.
 *
 * Checked against the actual runtime scene graph (three's `GLTFLoader`), not
 * just the glTF document: each LOD is a `Group` (e.g. `Tree01LOD0`) whose
 * *children* are the real meshes, one per material, suffixed `_1`, `_2` (or
 * unsuffixed when there is only one, as `Tree10`'s bark-only stump). An
 * end-anchored `LOD{n}` alone matches none of these — it has to allow the
 * optional `_N` suffix.
 */
export function lodNamePredicate(level: 0 | 1 | 2): (name: string) => boolean {
  const pattern = new RegExp(`LOD${level}(_\\d+)?$`, 'i');
  return (name: string) => pattern.test(name);
}
