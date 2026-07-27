import { describe, expect, it } from 'vitest';
import { DEFAULT_LOD_THRESHOLDS, selectLod } from './lod';

describe('selectLod', () => {
  it('picks lod0 when close, with no previous level', () => {
    expect(selectLod(5, null)).toBe('lod0');
  });

  it('picks lod1 at medium distance', () => {
    expect(selectLod(50, null)).toBe('lod1');
  });

  it('picks lod2 when far', () => {
    expect(selectLod(200, null)).toBe('lod2');
  });

  it('does not flicker back to lod0 from lod1 within the hysteresis band', () => {
    const { lod0To1, hysteresis } = DEFAULT_LOD_THRESHOLDS;
    const justInsideBand = lod0To1 * (1 + hysteresis * 0.5); // between threshold and the upper hysteresis edge
    expect(selectLod(justInsideBand, 'lod1')).toBe('lod1');
  });

  it('drops from lod0 to lod1 once clearly past the upper hysteresis edge', () => {
    const { lod0To1, hysteresis } = DEFAULT_LOD_THRESHOLDS;
    const clearlyPast = lod0To1 * (1 + hysteresis * 2);
    expect(selectLod(clearlyPast, 'lod0')).toBe('lod1');
  });

  it('returns to lod0 from lod1 once clearly below the lower hysteresis edge', () => {
    const { lod0To1, hysteresis } = DEFAULT_LOD_THRESHOLDS;
    const clearlyBelow = lod0To1 * (1 - hysteresis * 2);
    expect(selectLod(clearlyBelow, 'lod1')).toBe('lod0');
  });

  it('drops from lod1 to lod2 once clearly past the upper hysteresis edge', () => {
    const { lod1To2, hysteresis } = DEFAULT_LOD_THRESHOLDS;
    const clearlyPast = lod1To2 * (1 + hysteresis * 2);
    expect(selectLod(clearlyPast, 'lod1')).toBe('lod2');
  });

  it('returns to lod1 from lod2 once clearly below the lower hysteresis edge', () => {
    const { lod1To2, hysteresis } = DEFAULT_LOD_THRESHOLDS;
    const clearlyBelow = lod1To2 * (1 - hysteresis * 2);
    expect(selectLod(clearlyBelow, 'lod2')).toBe('lod1');
  });

  it('can skip straight from lod2 to lod0 on a big jump (e.g. teleport)', () => {
    expect(selectLod(1, 'lod2')).toBe('lod0');
  });
});
