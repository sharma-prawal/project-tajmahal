/**
 * Phase 4D production ground-material palette — plain `MeshStandardMaterial`
 * props only (no textures, no procedural shaders: "Do NOT create highly
 * detailed procedural materials" / "browser friendly"). Distinct from
 * `constants/greyboxMaterials.ts`'s placeholder palette (still used by the
 * Taj bake-off dev tooling and anything not yet rebuilt this phase) —
 * this is the first "production, not placeholder" material set in the
 * project, scoped to the Charbagh grounds only.
 */
export const GROUND_MATERIAL = {
  marble: { color: '#ece4d3', roughness: 0.35, metalness: 0.02 },
  marbleCoping: { color: '#f4eee0', roughness: 0.3, metalness: 0.02 },
  sandstone: { color: '#c98f5e', roughness: 0.8, metalness: 0 },
  sandstoneShadow: { color: '#a8703f', roughness: 0.85, metalness: 0 },
  stonePaving: { color: '#b9ad98', roughness: 0.65, metalness: 0 },
  preparedEarth: { color: '#8a7256', roughness: 1, metalness: 0 },
  gravel: { color: '#9c9284', roughness: 0.95, metalness: 0 },
  gardenBed: { color: '#766b4e', roughness: 1, metalness: 0 },
  marbleInlay: { color: '#c9bfae', roughness: 0.48, metalness: 0.01 },
  water: { color: '#3f6b7a', roughness: 0.15, metalness: 0.1 },
} as const;
