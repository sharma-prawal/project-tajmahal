import { describe, expect, it } from 'vitest';
import { buildAllLodReports, buildLodReport, type LodValidationIssue } from './lodReport';

describe('lodReport', () => {
  it('produces zero validation issues (no NaN positions, no degenerate normals) across all three LODs', () => {
    const issues: LodValidationIssue[] = [];
    buildLodReport('lod0', issues);
    buildLodReport('lod1', issues);
    buildLodReport('lod2', issues);
    expect(issues).toEqual([]);
  });

  it('decreases triangle count monotonically from lod0 to lod2', () => {
    const reports = buildAllLodReports();
    expect(reports.lod0.triangles).toBeGreaterThan(reports.lod1.triangles);
    expect(reports.lod1.triangles).toBeGreaterThan(reports.lod2.triangles);
  });

  it('decreases vertex count monotonically from lod0 to lod2', () => {
    const reports = buildAllLodReports();
    expect(reports.lod0.vertices).toBeGreaterThan(reports.lod1.vertices);
    expect(reports.lod1.vertices).toBeGreaterThan(reports.lod2.vertices);
  });

  it('reports a sane, non-empty bounds size for every LOD', () => {
    const reports = buildAllLodReports();
    for (const lod of ['lod0', 'lod1', 'lod2'] as const) {
      const { size } = reports[lod].bounds;
      expect(size.x).toBeGreaterThan(0);
      expect(size.y).toBeGreaterThan(0);
      expect(size.z).toBeGreaterThan(0);
      expect(Number.isFinite(size.x)).toBe(true);
      expect(Number.isFinite(size.y)).toBe(true);
      expect(Number.isFinite(size.z)).toBe(true);
    }
  });

  it('reports exactly 3 modules at every LOD', () => {
    const reports = buildAllLodReports();
    expect(reports.lod0.moduleCount).toBe(3);
    expect(reports.lod1.moduleCount).toBe(3);
    expect(reports.lod2.moduleCount).toBe(3);
  });

  it('stays a small fraction of one mobile-low triangle budget at every LOD', () => {
    const reports = buildAllLodReports();
    expect(reports.lod0.estimatedMobileCostShare).toBeLessThan(0.1);
    expect(reports.lod2.estimatedMobileCostShare).toBeLessThan(reports.lod0.estimatedMobileCostShare);
  });
});
