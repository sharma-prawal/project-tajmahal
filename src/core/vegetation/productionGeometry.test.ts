import { describe, expect, it } from 'vitest';
import { createGrassTuftGeometry, createRockGeometry } from './productionGeometry';

// Phase 10D deleted the procedural tree-canopy/trunk and hedge geometry along
// with the two cases that covered them. Their silhouette and LOD behaviour is
// now the UniversalPack's own authored LOD levels, exercised by `Trees.tsx`
// through `lodNamePredicate` rather than generated here.
describe('production vegetation geometry', () => {
  it('writes root-to-tip weights into grass vertex colors', () => {
    const colors = createGrassTuftGeometry().getAttribute('color');
    expect(Array.from({ length: colors.count }, (_, i) => colors.getX(i))).toContain(0);
    expect(Array.from({ length: colors.count }, (_, i) => colors.getX(i))).toContain(1);
  });

  it('builds six deterministic rock variants', () => {
    const signatures = Array.from({ length: 6 }, (_, i) => {
      const position = createRockGeometry(i).getAttribute('position');
      return `${position.getX(0).toFixed(3)}:${position.getY(1).toFixed(3)}:${position.getZ(2).toFixed(3)}`;
    });
    expect(new Set(signatures).size).toBe(6);
  });
});
