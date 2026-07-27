import { TIER_BUDGETS, type TierBudget } from '@constants/budgets';
import type { PerfSample } from './perfSample';

/**
 * The Phase 1 quality profile only has two tiers ('low' | 'high'); the
 * reviewed performance budgets (Part 11) define four. This is a documented,
 * approximate mapping — not a claim that 'low' IS "Mobile Low" — until the
 * quality-profile system itself grows enough tiers to match one-to-one.
 */
export function mapQualityProfileToTierBudget(qualityProfileName: string): TierBudget {
  if (qualityProfileName === 'low') return TIER_BUDGETS.mobileHigh;
  if (qualityProfileName === 'medium') return TIER_BUDGETS.desktopMedium;
  return TIER_BUDGETS.desktopHigh;
}

export interface BudgetWarning {
  metric: 'triangles' | 'drawCalls' | 'shadowCasters';
  value: number;
  budget: number;
}

/** Pure — compares a live sample against a tier budget, returning every exceeded metric (empty array = within budget). */
export function checkBudget(sample: Pick<PerfSample, 'triangles' | 'drawCalls' | 'shadowCasters'>, budget: TierBudget): BudgetWarning[] {
  const warnings: BudgetWarning[] = [];
  if (sample.triangles > budget.visibleTriangles) {
    warnings.push({ metric: 'triangles', value: sample.triangles, budget: budget.visibleTriangles });
  }
  if (sample.drawCalls > budget.drawCalls) {
    warnings.push({ metric: 'drawCalls', value: sample.drawCalls, budget: budget.drawCalls });
  }
  if (sample.shadowCasters > budget.shadowCasters) {
    warnings.push({ metric: 'shadowCasters', value: sample.shadowCasters, budget: budget.shadowCasters });
  }
  return warnings;
}
