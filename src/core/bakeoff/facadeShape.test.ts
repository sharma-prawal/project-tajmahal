import { describe, expect, it } from 'vitest';
import { buildFacadeShape } from './facadeShape';

describe('buildFacadeShape', () => {
  it('lod0 has a real arch hole (pointed arch)', () => {
    const shape = buildFacadeShape('lod0');
    expect(shape.holes.length).toBe(1);
    expect(shape.holes[0].getPoints().length).toBeGreaterThan(2);
  });

  it('lod1 has a real arch hole (simplified round-top)', () => {
    const shape = buildFacadeShape('lod1');
    expect(shape.holes.length).toBe(1);
  });

  it('lod2 has no opening — simplified silhouette only', () => {
    const shape = buildFacadeShape('lod2');
    expect(shape.holes.length).toBe(0);
  });

  it('the outer boundary is a closed rectangle at every LOD', () => {
    for (const lod of ['lod0', 'lod1', 'lod2'] as const) {
      const shape = buildFacadeShape(lod);
      const points = shape.getPoints();
      expect(points.length).toBeGreaterThanOrEqual(4);
    }
  });
});
