import { REVIEW_TIER_ORDER, type ReviewTier } from '../bakeoff/reviewConfig';

export type BenchmarkTier = ReviewTier | 'device';

/**
 * Pure Phase 4C benchmark cycle orders — kept in their own file (no
 * `zustand`/store dependency, no alias chain into world/scene constants) so
 * `scripts/benchmark-render.ts` can import them directly under
 * `tsconfig.scripts.json` (relative imports, no path aliases) without
 * dragging in `useLightingDebugStore`'s full dependency graph.
 * `useLightingDebugStore.ts` re-exports these for its own cycle functions.
 */
export const BENCHMARK_TIER_ORDER: BenchmarkTier[] = ['device', ...REVIEW_TIER_ORDER];
export const DPR_STEPS: (number | null)[] = [null, 0.75, 1.0, 1.25, 1.5, 2.0];
export const SHADOW_MAP_SIZE_STEPS: (number | null)[] = [null, 512, 1024, 2048, 4096];
