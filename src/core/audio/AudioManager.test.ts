import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_BUS_BASE, AUDIO_STREAM_TARGETS, AudioManager } from './AudioManager';
import { EXPERIENCE_SETTINGS_DEFAULTS } from '@state/useExperienceSettingsStore';

class FakeParam {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
}
class FakeNode {
  gain = new FakeParam(); pan = new FakeParam(); frequency = new FakeParam(); Q = new FakeParam(); playbackRate = new FakeParam();
  type = ''; buffer: unknown = null; loop = false; onended: (() => void) | null = null;
  connect() { return this; } start() {} stop() { this.onended?.(); }
}
class FakeBuffer { private readonly data = new Float32Array(4000); getChannelData() { return this.data; } }
class FakeAudioContext {
  static instances = 0;
  state: AudioContextState = 'suspended'; currentTime = 1; sampleRate = 1000; destination = new FakeNode() as unknown as AudioDestinationNode;
  constructor() { FakeAudioContext.instances += 1; }
  createGain() { return new FakeNode() as unknown as GainNode; }
  createBuffer() { return new FakeBuffer() as unknown as AudioBuffer; }
  createBufferSource() { return new FakeNode() as unknown as AudioBufferSourceNode; }
  createBiquadFilter() { return new FakeNode() as unknown as BiquadFilterNode; }
  createStereoPanner() { return new FakeNode() as unknown as StereoPannerNode; }
  createOscillator() { return new FakeNode() as unknown as OscillatorNode; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}

describe('AudioManager', () => {
  beforeEach(() => { FakeAudioContext.instances = 0; vi.stubGlobal('AudioContext', FakeAudioContext); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('unlocks once and prevents duplicate ambience graphs', async () => {
    const manager = new AudioManager();
    expect(manager.init()).toBe(true); expect(manager.init()).toBe(true); expect(FakeAudioContext.instances).toBe(1);
    await manager.resume(); expect(manager.getDiagnostics().lifecycle).toBe('running'); expect(manager.getDiagnostics().ambienceActive).toBe(true);
    manager.dispose();
  });

  it('clamps settings, applies mute, quality limits, and cleanup', () => {
    const manager = new AudioManager(); manager.init();
    manager.setVolumes({ master: 2, ambience: -1, effects: Number.NaN }); manager.setMuted(true); manager.setQuality('low');
    expect(manager.getDiagnostics()).toMatchObject({ muted: true, masterVolume: 1, ambienceVolume: 0, effectsVolume: 0, voiceLimit: 5 });
    manager.dispose(); expect(manager.getDiagnostics().lifecycle).toBe('disposed'); expect(manager.getDiagnostics().activeVoices).toBe(0);
  });

  it('tracks memory lifecycle without duplicate transitions', () => {
    const manager = new AudioManager(); manager.init(); manager.setMemoryActive(true); manager.setMemoryActive(true);
    expect(manager.getDiagnostics().memoryActive).toBe(true);
    manager.setMemoryActive(false); expect(manager.getDiagnostics().memoryActive).toBe(false); manager.dispose();
  });

  it('keeps persisted audio defaults in the settings model', () => {
    expect(EXPERIENCE_SETTINGS_DEFAULTS).toMatchObject({
      audioMasterVolume: 0.72,
      audioAmbienceVolume: 0.42,
      audioEffectsVolume: 0.64,
      audioNarrationVolume: 0.86,
    });
  });

  it('mixes music above footsteps before user volume sliders', () => {
    expect(AUDIO_BUS_BASE.footsteps).toBeLessThan(0.5);
    expect(AUDIO_BUS_BASE.music * AUDIO_STREAM_TARGETS.music).toBeGreaterThan(AUDIO_BUS_BASE.footsteps);
  });
});
