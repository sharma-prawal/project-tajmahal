import { describe, expect, it } from 'vitest';
import { TIER_BUDGETS } from '@constants/budgets';
import { checkBudget, mapQualityProfileToTierBudget } from './budgetCheck';

describe('mapQualityProfileToTierBudget', () => {
  it('maps "low" to Mobile High budget', () => {
    expect(mapQualityProfileToTierBudget('low')).toBe(TIER_BUDGETS.mobileHigh);
  });
  it('maps "high" to Desktop High budget', () => {
    expect(mapQualityProfileToTierBudget('high')).toBe(TIER_BUDGETS.desktopHigh);
  });
  it('maps "medium" to Desktop Medium budget', () => {
    expect(mapQualityProfileToTierBudget('medium')).toBe(TIER_BUDGETS.desktopMedium);
  });
});

describe('checkBudget', () => {
  const budget = TIER_BUDGETS.mobileLow;

  it('returns no warnings when well within budget', () => {
    const warnings = checkBudget({ triangles: 1000, drawCalls: 10, shadowCasters: 0 }, budget);
    expect(warnings).toEqual([]);
  });

  it('flags triangles over budget', () => {
    const warnings = checkBudget({ triangles: budget.visibleTriangles + 1, drawCalls: 0, shadowCasters: 0 }, budget);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].metric).toBe('triangles');
  });

  it('flags multiple metrics simultaneously', () => {
    const warnings = checkBudget(
      { triangles: budget.visibleTriangles + 1, drawCalls: budget.drawCalls + 1, shadowCasters: budget.shadowCasters + 1 },
      budget,
    );
    expect(warnings.map((w) => w.metric).sort()).toEqual(['drawCalls', 'shadowCasters', 'triangles']);
  });

  it('is not triggered exactly at the budget ceiling', () => {
    const warnings = checkBudget(
      { triangles: budget.visibleTriangles, drawCalls: budget.drawCalls, shadowCasters: budget.shadowCasters },
      budget,
    );
    expect(warnings).toEqual([]);
  });
});
