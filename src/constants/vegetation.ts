/**
 * Phase 4E vegetation palette + density/LOD tuning. Procedurally generated
 * geometry only (no textures, no downloaded models — see
 * docs/phase-4/vegetation.md "Asset sources" for why), so this is the
 * material/placement equivalent of `constants/groundMaterials.ts`.
 */
export const VEGETATION_MATERIAL = {
  foliageDark: { color: '#4a6b45', roughness: 0.85, metalness: 0 },
  foliageMid: { color: '#5d7f52', roughness: 0.85, metalness: 0 },
  foliageLight: { color: '#7a9a63', roughness: 0.85, metalness: 0 },
  bark: { color: '#5b4632', roughness: 0.95, metalness: 0 },
  hedge: { color: '#4f6b46', roughness: 0.8, metalness: 0 },
  flowerWarm: { color: '#e0a544', roughness: 0.6, metalness: 0 },
  flowerCool: { color: '#c85a6e', roughness: 0.6, metalness: 0 },
  flowerLight: { color: '#e8d6a8', roughness: 0.6, metalness: 0 },
  rock: { color: '#8b8577', roughness: 0.95, metalness: 0 },
} as const;

/** Distance (metres, from the reference point each vegetation group LODs against) — reuses the same threshold/hysteresis shape as `core/bakeoff/lod.ts`. */
export const VEGETATION_LOD_THRESHOLDS = {
  lod0To1: 25,
  lod1To2: 60,
  hysteresis: 0.15,
} as const;

export const VEGETATION_SEED = {
  trees: 1001,
  hedges: 1002,
  shrubs: 1003,
  flowers: 1004,
  grass: 1005,
  rocks: 1006,
} as const;
