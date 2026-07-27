import { describe, expect, it } from 'vitest';
import { createRippleTextureData, RIPPLE_TEXTURE_SIZE } from './rippleTexture';

describe('generated ripple texture', () => {
  it('is deterministic, power-of-two, and RGBA', () => {
    expect((RIPPLE_TEXTURE_SIZE & (RIPPLE_TEXTURE_SIZE - 1)) === 0).toBe(true);
    const first = createRippleTextureData();
    const second = createRippleTextureData();
    expect(first).toEqual(second);
    expect(first).toHaveLength(RIPPLE_TEXTURE_SIZE * RIPPLE_TEXTURE_SIZE * 4);
  });

  it('contains varied normalized surface data and opaque alpha-derived ripple weights', () => {
    const data = createRippleTextureData();
    const red = new Set(Array.from({ length: 256 }, (_, index) => data[index * 4]));
    const alpha = new Set(Array.from({ length: 256 }, (_, index) => data[index * 4 + 3]));
    expect(red.size).toBeGreaterThan(10);
    expect(alpha.size).toBeGreaterThan(10);
  });
});
