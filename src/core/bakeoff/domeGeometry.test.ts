import { describe, expect, it } from 'vitest';
import { buildDomeProfilePoints } from './domeGeometry';
import { TAJ_PROPORTIONS } from './tajProportions';

describe('buildDomeProfilePoints', () => {
  it('returns one point per profile entry by default', () => {
    const points = buildDomeProfilePoints();
    expect(points).toHaveLength(TAJ_PROPORTIONS.dome.profile.length);
  });

  it('starts at the drum radius and ends at the apex (radius 0)', () => {
    const points = buildDomeProfilePoints();
    expect(points[0].x).toBeCloseTo(TAJ_PROPORTIONS.dome.drumRadius, 5);
    expect(points[points.length - 1].x).toBeCloseTo(0, 5);
    expect(points[points.length - 1].y).toBeCloseTo(TAJ_PROPORTIONS.dome.apexHeight, 5);
  });

  it('is monotonically non-decreasing in height', () => {
    const points = buildDomeProfilePoints();
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].y).toBeGreaterThanOrEqual(points[i - 1].y);
    }
  });

  it('resamples to a requested lower segment count for LOD1/LOD2', () => {
    const points = buildDomeProfilePoints(3);
    expect(points).toHaveLength(3);
    expect(points[0].x).toBeCloseTo(TAJ_PROPORTIONS.dome.drumRadius, 5);
    expect(points[2].x).toBeCloseTo(0, 5);
  });
});
