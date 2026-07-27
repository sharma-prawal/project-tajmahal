import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import {
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type Texture,
} from 'three';

/**
 * Phase 9A production ground-texture sets — CC0 PBR from ambientCG
 * (Ground054 → warm compact sandstone dust, Gravel023 → pale packed gravel),
 * the two real surfaces the Charbagh forecourt/circulation actually needs.
 * Provenance + licence in `content/credits.json` and
 * `docs/phase-9/phase-9a-environment-foundations-report.md`.
 */
export const GROUND_TEXTURE_SETS = {
  sandstone: {
    map: '/assets/textures/ground-sandstone/basecolor.jpg',
    normalMap: '/assets/textures/ground-sandstone/normal.jpg',
    roughnessMap: '/assets/textures/ground-sandstone/roughness.jpg',
  },
  gravel: {
    map: '/assets/textures/ground-gravel/basecolor.jpg',
    normalMap: '/assets/textures/ground-gravel/normal.jpg',
    roughnessMap: '/assets/textures/ground-gravel/roughness.jpg',
  },
} as const;

type LoadedSet = Record<'map' | 'normalMap' | 'roughnessMap', Texture>;

/** Loads (drei-cached) both ground texture sets. Callers must clone before mutating. */
export function useGroundTextureSets() {
  const sandstone = useTexture(GROUND_TEXTURE_SETS.sandstone) as LoadedSet;
  const gravel = useTexture(GROUND_TEXTURE_SETS.gravel) as LoadedSet;
  return { sandstone, gravel };
}

export interface GroundMaterialOptions {
  /** Multiplicative colour over the (neutral) albedo — how we re-tint one soil scan into several surfaces. */
  tint?: string;
  /** Texture repeat, for box-UV geometry. Planar-UV merged surfaces bake tiling into UVs and keep this at 1. */
  repeat?: number | [number, number];
  roughness?: number;
  normalScale?: number;
  /** Reflected-environment strength — raised for polished marble sheen, low for matte stone. */
  envMapIntensity?: number;
  /** Drop the albedo map and drive colour from `tint` only (keeps a scan's normal/roughness relief on a clean base). */
  albedoFromTint?: boolean;
  /** Anisotropic filtering — keeps stone grain crisp at grazing angles on walls/paths. Clamped to hardware max by three. */
  anisotropy?: number;
  /** UV rotation in radians (about the tile centre) — for correcting texture orientation per surface. */
  rotation?: number;
}

/**
 * Clones a loaded set into an independent, configured `MeshStandardMaterial`.
 * Cloning is required so per-surface `repeat`/colour never mutate the shared
 * drei texture cache. Re-tinting one neutral soil/gravel scan into several
 * surfaces (apron, dry earth, garden soil) is deliberate reuse — one download,
 * many believable surfaces — rather than shipping a separate texture per zone.
 */
export function makeGroundMaterial(set: LoadedSet, options: GroundMaterialOptions = {}): MeshStandardMaterial {
  const repeat = options.repeat ?? 1;
  const [rx, ry] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  const map = set.map.clone();
  map.colorSpace = SRGBColorSpace;
  const normalMap = set.normalMap.clone();
  const roughnessMap = set.roughnessMap.clone();
  for (const texture of [map, normalMap, roughnessMap]) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(rx, ry);
    if (options.anisotropy !== undefined) texture.anisotropy = options.anisotropy;
    if (options.rotation !== undefined) {
      texture.center.set(0.5, 0.5);
      texture.rotation = options.rotation;
    }
    texture.needsUpdate = true;
  }
  const scale = options.normalScale ?? 1;
  const material = new MeshStandardMaterial({
    map: options.albedoFromTint ? null : map,
    normalMap,
    roughnessMap,
    normalScale: new Vector2(scale, scale),
    color: options.tint ?? '#ffffff',
    roughness: options.roughness ?? 1,
    metalness: 0,
  });
  if (options.albedoFromTint) map.dispose();
  if (options.envMapIntensity !== undefined) material.envMapIntensity = options.envMapIntensity;
  return material;
}

function disposeMaterial(material: MeshStandardMaterial) {
  material.map?.dispose();
  material.normalMap?.dispose();
  material.roughnessMap?.dispose();
  material.dispose();
}

/**
 * Shared, planar-UV (repeat = 1) ground materials for the authored zone
 * surfaces in `GroundZones`. `sandstone` and `gravel` are the two real
 * surfaces; `dryEarth` and `gardenSoil` are re-tints of the same sandstone
 * scan (a calm recessive base, and a dark cultivated bed soil). Disposed on
 * unmount.
 */
export function useGroundSurfaces() {
  const { sandstone, gravel } = useGroundTextureSets();
  const materials = useMemo(() => ({
    sandstone: makeGroundMaterial(sandstone, { tint: '#d8caac', roughness: 0.94, normalScale: 0.85 }),
    gravel: makeGroundMaterial(gravel, { tint: '#c9c5ba', roughness: 0.96, normalScale: 0.9 }),
    dryEarth: makeGroundMaterial(sandstone, { tint: '#b9a988', roughness: 1, normalScale: 0.5 }),
    gardenSoil: makeGroundMaterial(sandstone, { tint: '#6c563b', roughness: 1, normalScale: 1 }),
  }), [sandstone, gravel]);

  useEffect(() => () => Object.values(materials).forEach(disposeMaterial), [materials]);
  return materials;
}

[...Object.values(GROUND_TEXTURE_SETS)].forEach((set) => useTexture.preload(Object.values(set)));
