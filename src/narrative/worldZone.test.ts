import { describe, expect, it } from 'vitest';
import { AXIS_LAYOUT } from '@constants/world';
import { getWorldZone } from './worldZone';

describe('getWorldZone', () => {
  it('identifies the forecourt near spawn', () => {
    expect(getWorldZone(0)).toBe('forecourt');
  });

  it('identifies the gate', () => {
    const midGate = (AXIS_LAYOUT.gateStart + AXIS_LAYOUT.gateEnd) / 2;
    expect(getWorldZone(midGate)).toBe('gate');
  });

  it('identifies the garden', () => {
    const midGarden = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
    expect(getWorldZone(midGarden)).toBe('garden');
  });

  it('identifies the pool', () => {
    const midPool = (AXIS_LAYOUT.poolStart + AXIS_LAYOUT.poolEnd) / 2;
    expect(getWorldZone(midPool)).toBe('pool');
  });

  it('identifies the platform', () => {
    const midPlatform = (AXIS_LAYOUT.platformStart + AXIS_LAYOUT.platformEnd) / 2;
    expect(getWorldZone(midPlatform)).toBe('platform');
  });

  it('identifies the mausoleum', () => {
    const midMausoleum = (AXIS_LAYOUT.mausoleumStart + AXIS_LAYOUT.mausoleumEnd) / 2;
    expect(getWorldZone(midMausoleum)).toBe('mausoleum');
  });

  it('reports beyond outside the mandatory route', () => {
    expect(getWorldZone(1000)).toBe('beyond');
    expect(getWorldZone(-1000)).toBe('beyond');
  });
});
