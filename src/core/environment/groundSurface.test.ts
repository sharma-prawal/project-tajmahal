import { describe, expect, it } from 'vitest';
import { buildGroundSurfaceGeometry, frameRects, type GroundRect } from './groundSurface';

const RECT: GroundRect = { minX: -2, maxX: 2, minZ: -10, maxZ: -6 };

describe('buildGroundSurfaceGeometry', () => {
  it('emits six vertices (two triangles) per rect', () => {
    const geometry = buildGroundSurfaceGeometry([RECT, RECT]);
    expect(geometry.getAttribute('position').count).toBe(12);
  });

  it('places every vertex at the requested height', () => {
    const geometry = buildGroundSurfaceGeometry([RECT], { y: 0.25 });
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i += 1) expect(position.getY(i)).toBe(0.25);
  });

  it('points every normal straight up', () => {
    const geometry = buildGroundSurfaceGeometry([RECT]);
    const normal = geometry.getAttribute('normal');
    for (let i = 0; i < normal.count; i += 1) {
      expect([normal.getX(i), normal.getY(i), normal.getZ(i)]).toEqual([0, 1, 0]);
    }
  });

  it('winds both triangles so the surface faces up (positive Y cross product)', () => {
    const geometry = buildGroundSurfaceGeometry([RECT]);
    const p = geometry.getAttribute('position');
    for (let t = 0; t < 2; t += 1) {
      const o = t * 3;
      const ax = p.getX(o), az = p.getZ(o);
      const bx = p.getX(o + 1), bz = p.getZ(o + 1);
      const cx = p.getX(o + 2), cz = p.getZ(o + 2);
      // y-component of (b-a) x (c-a) must be positive for an up-facing winding
      const crossY = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      expect(crossY).toBeGreaterThan(0);
    }
  });

  it('derives planar UVs from world position and tile size', () => {
    const geometry = buildGroundSurfaceGeometry([RECT], { tile: 4 });
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < position.count; i += 1) {
      expect(uv.getX(i)).toBeCloseTo(position.getX(i) / 4);
      expect(uv.getY(i)).toBeCloseTo(position.getZ(i) / 4);
    }
  });
});

describe('frameRects', () => {
  const frame = frameRects(RECT, 1);

  it('returns four border strips', () => {
    expect(frame).toHaveLength(4);
  });

  it('never covers the rect interior', () => {
    const inside = (r: GroundRect, x: number, z: number) =>
      x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;
    const cx = (RECT.minX + RECT.maxX) / 2;
    const cz = (RECT.minZ + RECT.maxZ) / 2;
    for (const strip of frame) expect(inside(strip, cx, cz)).toBe(false);
  });

  it('extends exactly one band beyond the source rect', () => {
    const minX = Math.min(...frame.map((r) => r.minX));
    const maxX = Math.max(...frame.map((r) => r.maxX));
    expect(minX).toBe(RECT.minX - 1);
    expect(maxX).toBe(RECT.maxX + 1);
  });
});
