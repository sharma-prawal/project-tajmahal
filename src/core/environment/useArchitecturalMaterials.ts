import { useTexture } from '@react-three/drei';
import { makeGroundMaterial, type GroundMaterialOptions } from './useGroundSurfaces';

/**
 * Phase 9B / 9B.1 architectural PBR sets — CC0 from ambientCG:
 *   • Marble025 → clean white marble, subtle non-directional veining;
 *   • Ground054 → warm, isotropic (non-directional) sandstone grain.
 *
 * 9B.1 correction: the architectural sandstone previously used Travertine007,
 * whose strong sedimentary *banding* read as wood grain / plywood / bark on
 * flat rectangular architecture. It is re-pointed here at the non-directional
 * Ground054 scan (already loaded by the terrain), so no orientation of the UVs
 * can produce a directional/wood artifact. Travertine is no longer referenced,
 * so its texture memory is freed. Each structure builds its own material from
 * these sets with a per-asset repeat/anisotropy for consistent texel density —
 * there is deliberately no single forced repeat value.
 */
export const ARCH_TEXTURE_SETS = {
  marble: {
    map: '/assets/textures/arch-marble/basecolor.jpg',
    normalMap: '/assets/textures/arch-marble/normal.jpg',
    roughnessMap: '/assets/textures/arch-marble/roughness.jpg',
  },
  sandstone: {
    map: '/assets/textures/ground-sandstone/basecolor.jpg',
    normalMap: '/assets/textures/ground-sandstone/normal.jpg',
    roughnessMap: '/assets/textures/ground-sandstone/roughness.jpg',
  },
} as const;

type LoadedSet = Record<'map' | 'normalMap' | 'roughnessMap', import('three').Texture>;

export function useArchTextureSets() {
  const marble = useTexture(ARCH_TEXTURE_SETS.marble) as LoadedSet;
  const sandstone = useTexture(ARCH_TEXTURE_SETS.sandstone) as LoadedSet;
  return { marble, sandstone };
}

/**
 * For box geometry: repeat that yields a target world tile size on the largest
 * face, so texel density (stone-block scale) is consistent across differently
 * sized surfaces. `tile` is metres of world per texture tile.
 */
export function tileRepeat(faceWidth: number, faceHeight: number, tile: number): [number, number] {
  return [Math.max(1, Math.round(faceWidth / tile)), Math.max(1, Math.round(faceHeight / tile))];
}

export { makeGroundMaterial as makeArchMaterial };
export type { GroundMaterialOptions as ArchMaterialOptions };

[...Object.values(ARCH_TEXTURE_SETS)].forEach((set) => useTexture.preload(Object.values(set)));
