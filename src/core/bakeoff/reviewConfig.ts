/**
 * Pure config types + resolvers for the bake-off review mode (Phase 3B,
 * Part 1/4). Deliberately bounded — a small fixed set of named choices per
 * axis, not a free-form visual editor (Part 4: "do not create an
 * unconstrained visual editor").
 */

export type ReviewBackground = 'neutral' | 'sunset';
export type ReviewTier = 'desktopHigh' | 'desktopMedium' | 'mobileHigh' | 'mobileLow';
export type ReviewLodOverride = 'auto' | 'lod0' | 'lod1' | 'lod2';
export type ReviewMaterial = 'neutralClay' | 'ivoryMarble';
export type ReviewRoughness = 'low' | 'mid' | 'high';
export type ReviewFacadeDepth = 'reduced' | 'current' | 'increased';
export type ReviewDomeProfile = 'current' | 'conservativeAlternate';
export type ReviewMinaretTaper = 'current' | 'conservativeAlternate';
export type ReviewLightMode = 'frontalDiagnostic' | 'sunsetProjectDirection';
export type ReviewDiagnostic = 'none' | 'wireframe' | 'materialSlots' | 'silhouetteMask' | 'bounds' | 'modulePivots';

/** Render settings each of the four reviewed tiers implies for the review-mode canvas override (Part 1/3). */
export interface TierRenderSettings {
  label: string;
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
}

export const TIER_RENDER_SETTINGS: Record<ReviewTier, TierRenderSettings> = {
  desktopHigh: { label: 'Desktop High', dpr: [1, 2], antialias: true, shadows: true, shadowMapSize: 2048 },
  desktopMedium: { label: 'Desktop Medium', dpr: [1, 1.5], antialias: true, shadows: true, shadowMapSize: 1024 },
  mobileHigh: { label: 'Mobile High', dpr: [1, 2], antialias: false, shadows: true, shadowMapSize: 1024 },
  mobileLow: { label: 'Mobile Low', dpr: [1, 1], antialias: false, shadows: false, shadowMapSize: 512 },
};

export const REVIEW_TIER_ORDER: ReviewTier[] = ['desktopHigh', 'desktopMedium', 'mobileHigh', 'mobileLow'];
export const REVIEW_LOD_ORDER: ReviewLodOverride[] = ['auto', 'lod0', 'lod1', 'lod2'];
export const REVIEW_BACKGROUND_ORDER: ReviewBackground[] = ['sunset', 'neutral'];
export const REVIEW_MATERIAL_ORDER: ReviewMaterial[] = ['ivoryMarble', 'neutralClay'];
export const REVIEW_ROUGHNESS_ORDER: ReviewRoughness[] = ['low', 'mid', 'high'];
export const REVIEW_FACADE_DEPTH_ORDER: ReviewFacadeDepth[] = ['reduced', 'current', 'increased'];
export const REVIEW_DOME_PROFILE_ORDER: ReviewDomeProfile[] = ['current', 'conservativeAlternate'];
export const REVIEW_MINARET_TAPER_ORDER: ReviewMinaretTaper[] = ['current', 'conservativeAlternate'];
export const REVIEW_LIGHT_MODE_ORDER: ReviewLightMode[] = ['sunsetProjectDirection', 'frontalDiagnostic'];
export const REVIEW_DIAGNOSTIC_ORDER: ReviewDiagnostic[] = [
  'none',
  'wireframe',
  'materialSlots',
  'silhouetteMask',
  'bounds',
  'modulePivots',
];

export const ROUGHNESS_VALUE: Record<ReviewRoughness, number> = { low: 0.3, mid: 0.6, high: 0.9 };
export const FACADE_DEPTH_MULTIPLIER: Record<ReviewFacadeDepth, number> = {
  reduced: 0.7,
  current: 1,
  increased: 1.3,
};

/** Cycles to the next value in a fixed, ordered option list — wraps around. */
export function cycleOption<T>(order: readonly T[], current: T): T {
  const index = order.indexOf(current);
  return order[(index + 1) % order.length];
}

/** Per-module debug tint for the `materialSlots` diagnostic (Part 3 capture matrix). */
export const MODULE_SLOT_COLOR = {
  facade: '#e0b34d',
  dome: '#4dc9e0',
  minaret: '#e04d9e',
} as const;

const SILHOUETTE_MASK_COLOR = '#000000';

/**
 * Resolves the final material color for a bake-off module mesh, given the
 * shared bounded material choice and the active diagnostic overlay.
 * Diagnostics win over the material choice since they exist to isolate one
 * read (silhouette, material-slot boundaries) at a time.
 */
export function resolveReviewColor(
  moduleSlot: keyof typeof MODULE_SLOT_COLOR,
  baseColor: string,
  neutralClayColor: string,
  reviewActive: boolean,
  material: ReviewMaterial,
  diagnostic: ReviewDiagnostic,
): string {
  if (reviewActive && diagnostic === 'silhouetteMask') return SILHOUETTE_MASK_COLOR;
  if (reviewActive && diagnostic === 'materialSlots') return MODULE_SLOT_COLOR[moduleSlot];
  if (reviewActive && material === 'neutralClay') return neutralClayColor;
  return baseColor;
}
