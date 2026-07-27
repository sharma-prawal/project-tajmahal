import { describe, expect, it } from 'vitest';
import { BAKEOFF_REVIEW_VIEWS } from './reviewViews';

describe('BAKEOFF_REVIEW_VIEWS', () => {
  it('defines exactly six views (Part 11)', () => {
    expect(BAKEOFF_REVIEW_VIEWS).toHaveLength(6);
  });

  it('every view has a unique id', () => {
    const ids = BAKEOFF_REVIEW_VIEWS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every view has finite, distinct position and lookAt vectors', () => {
    for (const view of BAKEOFF_REVIEW_VIEWS) {
      for (const value of [...view.position, ...view.lookAt]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      const same = view.position.every((v, i) => v === view.lookAt[i]);
      expect(same).toBe(false);
    }
  });

  it('covers the required framings: frontal, three-quarter, side, low-angle dome, minaret, distant', () => {
    const ids = BAKEOFF_REVIEW_VIEWS.map((v) => v.id);
    expect(ids).toEqual([
      'frontal',
      'three-quarter-left',
      'side',
      'low-angle-dome',
      'minaret-close-medium',
      'distant-silhouette',
    ]);
  });
});
