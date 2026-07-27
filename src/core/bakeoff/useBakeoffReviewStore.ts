import { create } from 'zustand';
import { BAKEOFF_REVIEW_VIEWS } from './reviewViews';
import {
  cycleOption,
  REVIEW_BACKGROUND_ORDER,
  REVIEW_DIAGNOSTIC_ORDER,
  REVIEW_DOME_PROFILE_ORDER,
  REVIEW_FACADE_DEPTH_ORDER,
  REVIEW_LIGHT_MODE_ORDER,
  REVIEW_LOD_ORDER,
  REVIEW_MATERIAL_ORDER,
  REVIEW_MINARET_TAPER_ORDER,
  REVIEW_ROUGHNESS_ORDER,
  REVIEW_TIER_ORDER,
  type ReviewBackground,
  type ReviewDiagnostic,
  type ReviewDomeProfile,
  type ReviewFacadeDepth,
  type ReviewLightMode,
  type ReviewLodOverride,
  type ReviewMaterial,
  type ReviewMinaretTaper,
  type ReviewRoughness,
  type ReviewTier,
} from './reviewConfig';

interface BakeoffReviewState {
  active: boolean;
  viewIndex: number;
  background: ReviewBackground;
  fog: boolean;
  shadows: boolean;
  tier: ReviewTier;
  lodOverride: ReviewLodOverride;
  material: ReviewMaterial;
  roughness: ReviewRoughness;
  facadeDepth: ReviewFacadeDepth;
  domeProfile: ReviewDomeProfile;
  minaretTaper: ReviewMinaretTaper;
  lightMode: ReviewLightMode;
  diagnostic: ReviewDiagnostic;

  toggle: () => void;
  next: () => void;
  cycleBackground: () => void;
  toggleFog: () => void;
  toggleShadows: () => void;
  cycleTier: () => void;
  cycleLod: () => void;
  cycleMaterial: () => void;
  cycleRoughness: () => void;
  cycleFacadeDepth: () => void;
  cycleDomeProfile: () => void;
  cycleMinaretTaper: () => void;
  cycleLightMode: () => void;
  cycleDiagnostic: () => void;
  reset: () => void;
}

const DEFAULTS = {
  background: 'sunset' as ReviewBackground,
  fog: true,
  shadows: true,
  tier: 'desktopHigh' as ReviewTier,
  lodOverride: 'auto' as ReviewLodOverride,
  material: 'ivoryMarble' as ReviewMaterial,
  roughness: 'mid' as ReviewRoughness,
  facadeDepth: 'current' as ReviewFacadeDepth,
  domeProfile: 'current' as ReviewDomeProfile,
  minaretTaper: 'current' as ReviewMinaretTaper,
  lightMode: 'sunsetProjectDirection' as ReviewLightMode,
  diagnostic: 'none' as ReviewDiagnostic,
};

/**
 * Dev-only bake-off review mode state (Phase 3B, Part 1). While `active`,
 * `ExplorationCameraRig` yields to `BakeoffReviewCamera`, and every render
 * axis below (background/fog/shadows/tier/LOD/materials/geometry
 * alternates/light) is a small fixed set of named choices — not a free
 * visual editor (Part 4) — read directly by the scene components that own
 * each concern (`CanvasRoot`, `Lighting`, `SkyAndFog`, the bake-off
 * modules).
 */
export const useBakeoffReviewStore = create<BakeoffReviewState>((set, get) => ({
  active: false,
  viewIndex: 0,
  ...DEFAULTS,

  toggle: () => set((state) => ({ active: !state.active, viewIndex: 0 })),
  next: () => set({ viewIndex: (get().viewIndex + 1) % BAKEOFF_REVIEW_VIEWS.length }),
  cycleBackground: () => set((s) => ({ background: cycleOption(REVIEW_BACKGROUND_ORDER, s.background) })),
  toggleFog: () => set((s) => ({ fog: !s.fog })),
  toggleShadows: () => set((s) => ({ shadows: !s.shadows })),
  cycleTier: () => set((s) => ({ tier: cycleOption(REVIEW_TIER_ORDER, s.tier) })),
  cycleLod: () => set((s) => ({ lodOverride: cycleOption(REVIEW_LOD_ORDER, s.lodOverride) })),
  cycleMaterial: () => set((s) => ({ material: cycleOption(REVIEW_MATERIAL_ORDER, s.material) })),
  cycleRoughness: () => set((s) => ({ roughness: cycleOption(REVIEW_ROUGHNESS_ORDER, s.roughness) })),
  cycleFacadeDepth: () => set((s) => ({ facadeDepth: cycleOption(REVIEW_FACADE_DEPTH_ORDER, s.facadeDepth) })),
  cycleDomeProfile: () => set((s) => ({ domeProfile: cycleOption(REVIEW_DOME_PROFILE_ORDER, s.domeProfile) })),
  cycleMinaretTaper: () => set((s) => ({ minaretTaper: cycleOption(REVIEW_MINARET_TAPER_ORDER, s.minaretTaper) })),
  cycleLightMode: () => set((s) => ({ lightMode: cycleOption(REVIEW_LIGHT_MODE_ORDER, s.lightMode) })),
  cycleDiagnostic: () => set((s) => ({ diagnostic: cycleOption(REVIEW_DIAGNOSTIC_ORDER, s.diagnostic) })),
  reset: () => set({ ...DEFAULTS }),
}));
