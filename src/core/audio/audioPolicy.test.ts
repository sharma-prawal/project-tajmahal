import { describe, expect, it } from 'vitest';
import { FOOTSTEP_ASSETS } from './audioAssets';
import { AUDIO_VOICE_LIMITS, clampVolume, footstepIntervalSeconds, footstepSurfaceAt, fountainAttenuation, memoryAmbienceScale } from './audioPolicy';

describe('audio policy', () => {
  it('clamps volumes and rejects non-finite input', () => {
    expect(clampVolume(-1)).toBe(0); expect(clampVolume(0.4)).toBe(0.4); expect(clampVolume(2)).toBe(1); expect(clampVolume(Number.NaN)).toBe(0);
  });
  it('uses a faster but bounded running cadence', () => {
    expect(footstepIntervalSeconds(4.2, true)).toBeLessThan(footstepIntervalSeconds(1.8, false));
    expect(footstepIntervalSeconds(0, false)).toBeGreaterThan(0.4);
  });
  it('attenuates fountain energy smoothly', () => {
    expect(fountainAttenuation(0)).toBe(1); expect(fountainAttenuation(8)).toBeCloseTo(0.5); expect(fountainAttenuation(80)).toBeLessThan(0.02);
  });
  it('ducks ambience without muting memory space', () => {
    expect(memoryAmbienceScale(true)).toBeGreaterThan(0); expect(memoryAmbienceScale(true)).toBeLessThan(memoryAmbienceScale(false));
  });
  it('retains essential feedback on low while reducing concurrency', () => {
    expect(AUDIO_VOICE_LIMITS.low).toBeGreaterThanOrEqual(4); expect(AUDIO_VOICE_LIMITS.low).toBeLessThan(AUDIO_VOICE_LIMITS.high);
  });
  it('matches the visible authored walking surfaces', () => {
    expect(footstepSurfaceAt(12, -60)).toBe('grass');
    expect(footstepSurfaceAt(0, -60)).toBe('marble');
    expect(footstepSurfaceAt(51, -60)).toBe('stone');
    expect(footstepSurfaceAt(-4.4, -161.4)).toBe('stairs');
    expect(footstepSurfaceAt(4.4, -161.4)).toBe('stairs');
    expect(footstepSurfaceAt(0, -161.4)).not.toBe('stairs');
    expect(footstepSurfaceAt(12, -140)).toBe('sand');
    expect(footstepSurfaceAt(0, -180)).toBe('marble');
  });
  it('provides audio variants for every selected surface', () => {
    for (const surface of ['grass', 'marble', 'stone', 'stairs', 'sand', 'wood'] as const) {
      expect(FOOTSTEP_ASSETS[surface]).toHaveLength(4);
    }
    expect(FOOTSTEP_ASSETS.stairs).toBe(FOOTSTEP_ASSETS.stone);
  });
});
