/**
 * Reviewed performance budgets (docs/phase-2/11-performance-budgets.md).
 * Used by the dev-only performance instrumentation to warn when the current
 * scene exceeds its tier's ceiling — not enforced at runtime (no automatic
 * downgrade in Phase 3A beyond what the quality profile already selects).
 */
export interface TierBudget {
  name: string;
  visibleTriangles: number;
  drawCalls: number;
  shadowCasters: number;
  textureMemoryMiB: number;
  frameTargetFps: number;
}

export const TIER_BUDGETS: Record<'desktopHigh' | 'desktopMedium' | 'mobileHigh' | 'mobileLow', TierBudget> = {
  desktopHigh: {
    name: 'Desktop High',
    visibleTriangles: 900_000,
    drawCalls: 180,
    shadowCasters: 28,
    textureMemoryMiB: 384,
    frameTargetFps: 60,
  },
  desktopMedium: {
    name: 'Desktop Medium',
    visibleTriangles: 550_000,
    drawCalls: 140,
    shadowCasters: 18,
    textureMemoryMiB: 256,
    frameTargetFps: 60,
  },
  mobileHigh: {
    name: 'Mobile High',
    visibleTriangles: 260_000,
    drawCalls: 100,
    shadowCasters: 8,
    textureMemoryMiB: 192,
    frameTargetFps: 30,
  },
  mobileLow: {
    name: 'Mobile Low',
    visibleTriangles: 150_000,
    drawCalls: 70,
    shadowCasters: 4,
    textureMemoryMiB: 128,
    frameTargetFps: 30,
  },
};
