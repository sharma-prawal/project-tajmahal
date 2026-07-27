import { getWorldZone, type WorldZone } from '@narrative/worldZone';
import { AUDIO_ASSETS, FOOTSTEP_ASSETS } from './audioAssets';
import { TAJ_AUDIO_NARROW_Z } from '@constants/tajPlacement';
import {
  AUDIO_DEFAULTS,
  AUDIO_VOICE_LIMITS,
  clampVolume,
  footstepIntervalSeconds,
  footstepSurfaceAt,
  fountainAttenuation,
  memoryAmbienceScale,
  type AudioQualityName,
  type FootstepSurface,
} from './audioPolicy';

export type AudioBus = 'ambience' | 'environment' | 'footsteps' | 'interaction' | 'memory' | 'music' | 'narration';
export type AudioLifecycle = 'locked' | 'running' | 'suspended' | 'disposed' | 'unavailable';

const BUS_NAMES: AudioBus[] = ['ambience', 'environment', 'footsteps', 'interaction', 'memory', 'music', 'narration'];
export const AUDIO_BUS_BASE: Record<AudioBus, number> = { ambience: 1, environment: 0.62, footsteps: 0.46, interaction: 0.68, memory: 0.72, music: 0.82, narration: 1 };
const FADE_SECONDS = 0.35;

type StreamName = 'garden' | 'wind' | 'fountain' | 'interior' | 'music';
type StreamTrack = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  pan?: StereoPannerNode;
  started: boolean;
};
type Voice = { source: AudioBufferSourceNode; priority: number };
type NarrationRequest = { key: string; url: string; onEnded?: () => void };
type NarrationTrack = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

export const AUDIO_STREAM_TARGETS: Record<StreamName, number> = {
  garden: 0.72,
  wind: 0.2,
  fountain: 0,
  interior: 0,
  music: 0.72,
};

export interface AudioDiagnostics {
  lifecycle: AudioLifecycle;
  muted: boolean;
  activeVoices: number;
  voiceLimit: number;
  ambienceActive: boolean;
  musicActive: boolean;
  memoryActive: boolean;
  footstepCount: number;
  footstepSurface: FootstepSurface;
  fountainGain: number;
  worldZone: WorldZone;
  decodedBuffers: number;
  masterVolume: number;
  ambienceVolume: number;
  effectsVolume: number;
  narrationVolume: number;
  narrationActive: boolean;
  narrationPaused: boolean;
  narrationKey: string | null;
  locomotionSpeed: number;
  locomotionGrounded: boolean;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly busGains = new Map<AudioBus, GainNode>();
  private readonly streams = new Map<StreamName, StreamTrack>();
  private readonly bufferPromises = new Map<string, Promise<AudioBuffer>>();
  private readonly bufferUse = new Map<string, number>();
  private readonly voices = new Map<number, Voice>();
  private voiceSequence = 0;
  private lifecycle: AudioLifecycle = 'locked';
  private muted = false;
  private quality: AudioQualityName = 'high';
  private footstepCount = 0;
  private lastFootstepAt = -Infinity;
  private surface: FootstepSurface = 'sand';
  private memoryActive = false;
  private activeMemoryId: string | null = null;
  private fountainGain = 0;
  private worldZone: WorldZone = 'forecourt';
  private mausoleumNarrowed = false;
  private nextLeavesAt = 18;
  private masterVolume: number = AUDIO_DEFAULTS.master;
  private ambienceVolume: number = AUDIO_DEFAULTS.ambience;
  private effectsVolume: number = AUDIO_DEFAULTS.effects;
  private narrationVolume = 0.86;
  private narrationTrack: NarrationTrack | null = null;
  private pendingNarration: NarrationRequest | null = null;
  private narrationActive = false;
  private narrationPaused = false;
  private narrationKey: string | null = null;
  private readonly cueTimes = new Map<string, number>();
  private readonly listeners = new Set<() => void>();
  private locomotionSpeed = 0;
  private locomotionGrounded = false;
  private diagnosticsSnapshot: AudioDiagnostics = {
    lifecycle: 'locked', muted: false, activeVoices: 0, voiceLimit: AUDIO_VOICE_LIMITS.high,
    ambienceActive: false, musicActive: false, memoryActive: false, footstepCount: 0, footstepSurface: 'sand',
    fountainGain: 0, worldZone: 'forecourt', decodedBuffers: 0, masterVolume: AUDIO_DEFAULTS.master,
    ambienceVolume: AUDIO_DEFAULTS.ambience, effectsVolume: AUDIO_DEFAULTS.effects, narrationVolume: 0.86,
    narrationActive: false, narrationPaused: false, narrationKey: null,
    locomotionSpeed: 0, locomotionGrounded: false,
  };

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getDiagnostics = (): AudioDiagnostics => this.diagnosticsSnapshot;
  inspectDiagnostics = (): AudioDiagnostics => ({
    ...this.diagnosticsSnapshot,
    activeVoices: this.voices.size,
    footstepSurface: this.surface,
    fountainGain: this.fountainGain,
    worldZone: this.worldZone,
    decodedBuffers: this.bufferPromises.size,
    locomotionSpeed: this.locomotionSpeed,
    locomotionGrounded: this.locomotionGrounded,
  });

  prepareForUnlock(): void { if (!this.context) { this.lifecycle = 'locked'; this.publish(); } }

  init(): boolean {
    if (this.context) return true;
    const Constructor = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) { this.lifecycle = 'unavailable'; this.publish(); return false; }
    try {
      this.context = new Constructor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
      this.masterGain.connect(this.context.destination);
      for (const bus of BUS_NAMES) {
        const gain = this.context.createGain();
        gain.gain.value = AUDIO_BUS_BASE[bus];
        gain.connect(this.masterGain);
        this.busGains.set(bus, gain);
      }
      this.createStream('garden', AUDIO_ASSETS.ambience.garden, 'ambience');
      this.createStream('wind', AUDIO_ASSETS.ambience.wind, 'ambience');
      this.createStream('fountain', AUDIO_ASSETS.ambience.fountain, 'environment', true);
      this.createStream('interior', AUDIO_ASSETS.ambience.interior, 'ambience');
      this.createStream('music', AUDIO_ASSETS.music.romantic, 'music');
      this.createNarrationTrack();
      this.lifecycle = this.context.state === 'running' ? 'running' : 'suspended';
      this.applyMix(false);
      this.primeNearbyAssets();
      this.publish();
      return true;
    } catch {
      this.lifecycle = 'unavailable';
      this.context = null;
      this.publish();
      return false;
    }
  }

  async resume(): Promise<void> {
    if (!this.context) return;
    try {
      if (this.context.state === 'suspended') await this.context.resume();
      this.lifecycle = 'running';
      await Promise.all([...this.streams.values()].map(async (track) => {
        try { await track.element.play(); track.started = true; } catch { /* the next explicit gesture retries */ }
      }));
      if (this.pendingNarration) this.startNarration(this.pendingNarration);
    } catch { this.lifecycle = 'unavailable'; }
    this.publish();
  }

  async suspend(): Promise<void> {
    if (!this.context) return;
    for (const track of this.streams.values()) track.element.pause();
    try {
      if (this.context.state === 'running') await this.context.suspend();
      this.lifecycle = 'suspended';
    } catch { /* gameplay remains available */ }
    this.publish();
  }

  setVolumes(values: { master?: number; ambience?: number; effects?: number; narration?: number }): void {
    if (values.master !== undefined) this.masterVolume = clampVolume(values.master);
    if (values.ambience !== undefined) this.ambienceVolume = clampVolume(values.ambience);
    if (values.effects !== undefined) this.effectsVolume = clampVolume(values.effects);
    if (values.narration !== undefined) this.narrationVolume = clampVolume(values.narration);
    this.applyMix(true);
    this.publish();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.ramp(this.masterGain, muted ? 0 : this.masterVolume, FADE_SECONDS);
    this.publish();
  }

  setQuality(quality: AudioQualityName): void {
    this.quality = quality;
    this.enforceVoiceLimit();
    this.trimBufferCache();
    this.publish();
  }

  setMemoryActive(active: boolean, memoryId: string | null = null): void {
    if (active === this.memoryActive && memoryId === this.activeMemoryId) return;
    const previousId = this.activeMemoryId;
    this.memoryActive = active;
    this.activeMemoryId = active ? memoryId : null;
    this.applyMix(true);
    if (active) {
      this.playOneShot('memory-activate', AUDIO_ASSETS.memory.activate, 'memory', 70, 0.5);
      const identity = memoryId && AUDIO_ASSETS.memory[memoryId as keyof typeof AUDIO_ASSETS.memory];
      if (identity) this.playOneShot(`identity-${memoryId}`, identity, 'memory', 68, 1.5);
    } else if (previousId) {
      this.playOneShot('memory-complete', AUDIO_ASSETS.memory.complete, 'memory', 72, 0.5);
    }
    this.publish();
  }

  playInteractionCue(interactionId?: string | null): void {
    if (interactionId === 'finale.mausoleum-gate') {
      this.playOneShot('mausoleum-door', AUDIO_ASSETS.finale.door, 'interaction', 100, 5);
      return;
    }
    if (interactionId?.includes('letter')) {
      this.playOneShot('final-letter', AUDIO_ASSETS.finale.letter, 'interaction', 95, 1);
      return;
    }
    this.playOneShot('interaction-confirm', AUDIO_ASSETS.interaction.confirm, 'interaction', 50, 0.18);
  }

  playChiragIgnition(): void {
    this.playOneShot('chirag-ignite', AUDIO_ASSETS.interaction.chirag, 'interaction', 78, 0.45);
  }

  playJournalRecovery(): void {
    // A quiet paper/chime accent beneath the chirag event. Kept low-priority
    // and low-gain so the journal feels like a keepsake, never a reward popup.
    this.playOneShot('journal-recovery', AUDIO_ASSETS.ui.confirm, 'interaction', 30, 0.7, 0.92, 0.12);
  }

  playNarration(key: string, url: string, onEnded?: () => void): void {
    const request = { key, url, onEnded };
    if (this.narrationKey === key && (this.narrationActive || this.narrationPaused)) return;
    this.pendingNarration = request;
    if (!this.context || this.context.state !== 'running' || !this.narrationTrack) return;
    this.startNarration(request);
  }

  /** Playback position for word-synced captions; null while nothing is loaded for `key`. */
  getNarrationProgress(key: string): { currentTime: number; duration: number } | null {
    if (this.narrationKey !== key || !this.narrationTrack) return null;
    const { currentTime, duration } = this.narrationTrack.element;
    if (!Number.isFinite(duration) || duration <= 0) return null;
    return { currentTime, duration };
  }

  pauseNarration(): void {
    if (!this.narrationTrack || !this.narrationActive) return;
    this.narrationTrack.element.pause();
    this.narrationActive = false;
    this.narrationPaused = true;
    this.applyMix(true);
    this.publish();
  }

  resumeNarration(): void {
    if (!this.narrationTrack || !this.narrationPaused) return;
    void this.narrationTrack.element.play().then(() => {
      this.narrationActive = true;
      this.narrationPaused = false;
      this.applyMix(true);
      this.publish();
    }).catch(() => undefined);
  }

  stopNarration(key?: string): void {
    if (key && this.narrationKey !== key && this.pendingNarration?.key !== key) return;
    this.pendingNarration = null;
    if (this.narrationTrack) {
      this.narrationTrack.element.pause();
      this.narrationTrack.element.onended = null;
      this.narrationTrack.element.onerror = null;
    }
    this.narrationActive = false;
    this.narrationPaused = false;
    this.narrationKey = null;
    this.applyMix(true);
    this.publish();
  }

  playUiCue(kind: 'hover' | 'confirm' | 'cancel'): void {
    const priority = kind === 'hover' ? 26 : 36;
    this.playOneShot(`ui-${kind}`, AUDIO_ASSETS.ui[kind], 'interaction', priority, kind === 'hover' ? 0.08 : 0.14);
  }

  updateSpatialState(playerX: number, playerZ: number, fountainZ: readonly number[]): void {
    if (!this.context) return;
    this.surface = footstepSurfaceAt(playerX, playerZ);
    const nextZone = getWorldZone(playerZ);
    if (nextZone !== this.worldZone) {
      this.worldZone = nextZone;
      this.applyMix(true);
      this.primeNearbyAssets();
    }
    const narrowed = playerZ <= TAJ_AUDIO_NARROW_Z;
    if (narrowed !== this.mausoleumNarrowed) {
      this.mausoleumNarrowed = narrowed;
      this.playOneShot(
        narrowed ? 'enter-mausoleum' : 'leave-mausoleum',
        narrowed ? AUDIO_ASSETS.transition.close : AUDIO_ASSETS.transition.open,
        'interaction',
        60,
        1.2,
      );
      this.applyMix(true);
    }
    if (fountainZ.length) {
      let closest = Infinity;
      for (const z of fountainZ) closest = Math.min(closest, Math.hypot(playerX, playerZ - z));
      this.fountainGain = closest >= 40 ? 0 : fountainAttenuation(closest) * 0.24 * this.ambienceVolume * memoryAmbienceScale(this.memoryActive);
      this.rampStream('fountain', this.fountainGain, 0.18);
      const waterPan = this.streams.get('fountain')?.pan;
      if (waterPan) this.rampParam(waterPan.pan, Math.max(-0.35, Math.min(0.35, -playerX / 28)), 0.18);
    }
    const now = this.context.currentTime;
    if (this.worldZone === 'garden' && !this.memoryActive && now >= this.nextLeavesAt) {
      this.playOneShot('leaves', AUDIO_ASSETS.ambience.leaves, 'environment', 18, 1.5);
      this.nextLeavesAt = now + 22 + ((this.footstepCount * 7) % 19);
    }
  }

  updateLocomotion(input: { speed: number; running: boolean; grounded: boolean; enabled: boolean; nowSeconds: number }): void {
    this.locomotionSpeed = input.speed;
    this.locomotionGrounded = input.grounded;
    if (!this.context || this.context.state !== 'running' || !input.enabled || !input.grounded || input.speed < 0.35) return;
    const interval = footstepIntervalSeconds(input.speed, input.running);
    if (input.nowSeconds - this.lastFootstepAt < interval) return;
    this.lastFootstepAt = input.nowSeconds;
    this.playFootstep(input.running);
  }

  dispose(): void {
    for (const voice of this.voices.values()) {
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* already stopped */ }
    }
    this.voices.clear();
    for (const track of this.streams.values()) {
      track.element.pause();
      track.element.removeAttribute('src');
      track.element.load();
      track.source.disconnect();
      track.gain.disconnect();
      track.pan?.disconnect();
    }
    if (this.narrationTrack) {
      this.narrationTrack.element.pause();
      this.narrationTrack.element.removeAttribute('src');
      this.narrationTrack.element.load();
      this.narrationTrack.source.disconnect();
      this.narrationTrack.gain.disconnect();
    }
    this.narrationTrack = null;
    this.pendingNarration = null;
    this.narrationActive = false;
    this.narrationPaused = false;
    this.narrationKey = null;
    this.streams.clear();
    this.busGains.clear();
    this.bufferPromises.clear();
    this.bufferUse.clear();
    this.cueTimes.clear();
    this.masterGain = null;
    const context = this.context;
    this.context = null;
    if (context) void context.close();
    this.lifecycle = 'disposed';
    this.publish();
  }

  private createStream(name: StreamName, url: string, bus: AudioBus, panned = false): void {
    const context = this.context;
    const targetBus = this.busGains.get(bus);
    if (!context || !targetBus || typeof Audio === 'undefined' || typeof context.createMediaElementSource !== 'function') return;
    const element = new Audio(url);
    element.loop = true;
    element.preload = 'metadata';
    element.crossOrigin = 'anonymous';
    const source = context.createMediaElementSource(element);
    const gain = context.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    let pan: StereoPannerNode | undefined;
    if (panned && typeof context.createStereoPanner === 'function') {
      pan = context.createStereoPanner();
      pan.pan.value = 0;
      gain.connect(pan).connect(targetBus);
    } else {
      gain.connect(targetBus);
    }
    this.streams.set(name, { element, source, gain, pan, started: false });
  }

  private createNarrationTrack(): void {
    const context = this.context;
    const targetBus = this.busGains.get('narration');
    if (!context || !targetBus || typeof Audio === 'undefined' || typeof context.createMediaElementSource !== 'function') return;
    const element = new Audio();
    element.preload = 'metadata';
    element.crossOrigin = 'anonymous';
    const source = context.createMediaElementSource(element);
    const gain = context.createGain();
    gain.gain.value = 1;
    source.connect(gain).connect(targetBus);
    this.narrationTrack = { element, source, gain };
  }

  private startNarration(request: NarrationRequest): void {
    const context = this.context;
    const track = this.narrationTrack;
    if (!context || context.state !== 'running' || !track) return;
    track.element.pause();
    track.element.onended = null;
    track.element.onerror = null;
    track.element.src = request.url;
    track.element.currentTime = 0;
    track.element.load();
    this.pendingNarration = null;
    this.narrationKey = request.key;
    this.narrationActive = true;
    this.narrationPaused = false;
    track.element.onended = () => {
      if (this.narrationKey !== request.key) return;
      this.narrationActive = false;
      this.narrationPaused = false;
      this.narrationKey = null;
      this.applyMix(true);
      this.publish();
      request.onEnded?.();
    };
    track.element.onerror = () => {
      if (this.narrationKey !== request.key) return;
      this.narrationActive = false;
      this.narrationPaused = false;
      this.narrationKey = null;
      this.applyMix(true);
      this.publish();
    };
    this.applyMix(true);
    void track.element.play().catch(() => {
      if (this.narrationKey !== request.key) return;
      this.pendingNarration = request;
      this.narrationActive = false;
      this.applyMix(true);
      this.publish();
    });
    this.publish();
  }

  private primeNearbyAssets(): void {
    if (!this.context || typeof fetch !== 'function') return;
    const urls = [
      AUDIO_ASSETS.ui.confirm,
      AUDIO_ASSETS.interaction.confirm,
      ...FOOTSTEP_ASSETS[this.surface],
    ];
    if (this.worldZone === 'mausoleum') urls.push(AUDIO_ASSETS.finale.door, AUDIO_ASSETS.finale.letter);
    for (const url of urls) void this.loadBuffer(url).catch(() => undefined);
  }

  private loadBuffer(url: string): Promise<AudioBuffer> {
    const existing = this.bufferPromises.get(url);
    this.bufferUse.set(url, performance.now());
    if (existing) return existing;
    const context = this.context;
    if (!context || typeof fetch !== 'function' || typeof context.decodeAudioData !== 'function') return Promise.reject(new Error('Audio decoding unavailable'));
    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Audio request failed: ${response.status} ${url}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => { this.trimBufferCache(url); return buffer; });
    this.bufferPromises.set(url, promise);
    promise.catch(() => { this.bufferPromises.delete(url); this.bufferUse.delete(url); });
    return promise;
  }

  private trimBufferCache(protectUrl?: string): void {
    const limit: Record<AudioQualityName, number> = { high: 24, medium: 16, low: 10 };
    while (this.bufferPromises.size > limit[this.quality]) {
      const victim = [...this.bufferUse.entries()]
        .filter(([url]) => url !== protectUrl)
        .sort((a, b) => a[1] - b[1])[0];
      if (!victim) break;
      this.bufferPromises.delete(victim[0]);
      this.bufferUse.delete(victim[0]);
    }
  }

  private playFootstep(running: boolean): void {
    const variants = FOOTSTEP_ASSETS[this.surface === 'stairs' ? 'stone' : this.surface];
    const url = variants[this.footstepCount % variants.length];
    const surfaceGain: Record<FootstepSurface, number> = {
      grass: 0.78, marble: 0.66, stone: 0.72, stairs: 0.76, sand: 0.72, wood: 0.68,
    };
    this.playOneShot(
      `step-${this.surface}`,
      url,
      'footsteps',
      12,
      0,
      (running ? 1.04 : 1) * (this.surface === 'stairs' ? 0.94 : 1),
      surfaceGain[this.surface],
      false,
    );
    this.footstepCount += 1;
    this.publish();
  }

  private playOneShot(
    key: string,
    url: string,
    bus: AudioBus,
    priority: number,
    cooldownSeconds: number,
    playbackRate = 1,
    gainScale = 1,
    enforceCooldown = true,
  ): void {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const now = context.currentTime;
    const last = this.cueTimes.get(key) ?? -Infinity;
    if (enforceCooldown && now - last < cooldownSeconds) return;
    this.cueTimes.set(key, now);
    void this.loadBuffer(url).then((buffer) => {
      if (!this.context || this.context !== context || context.state !== 'running') return;
      const voiceId = this.reserveVoice(priority);
      if (voiceId === null) return;
      const targetBus = this.busGains.get(bus);
      if (!targetBus) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      gain.gain.value = gainScale;
      source.connect(gain).connect(targetBus);
      this.voices.set(voiceId, { source, priority });
      source.onended = () => { this.voices.delete(voiceId); this.publish(); };
      source.start();
      this.publish();
    }).catch(() => undefined);
  }

  private reserveVoice(priority: number): number | null {
    const limit = AUDIO_VOICE_LIMITS[this.quality];
    if (this.voices.size >= limit) {
      const victim = [...this.voices.entries()].sort((a, b) => a[1].priority - b[1].priority)[0];
      if (!victim || victim[1].priority >= priority) return null;
      victim[1].source.onended = null;
      try { victim[1].source.stop(); } catch { /* already stopped */ }
      this.voices.delete(victim[0]);
    }
    this.voiceSequence += 1;
    return this.voiceSequence;
  }

  private enforceVoiceLimit(): void {
    const limit = AUDIO_VOICE_LIMITS[this.quality];
    while (this.voices.size > limit) {
      const victim = [...this.voices.entries()].sort((a, b) => a[1].priority - b[1].priority)[0];
      if (!victim) break;
      victim[1].source.onended = null;
      try { victim[1].source.stop(); } catch { /* already stopped */ }
      this.voices.delete(victim[0]);
    }
  }

  private applyMix(smooth: boolean): void {
    this.ramp(this.masterGain, this.muted ? 0 : this.masterVolume, smooth ? FADE_SECONDS : 0);
    const narrationDuck = this.narrationActive ? 0.28 : 1;
    const ambience = this.ambienceVolume * memoryAmbienceScale(this.memoryActive) * narrationDuck;
    this.ramp(this.busGains.get('ambience') ?? null, ambience, smooth ? 0.8 : 0);
    this.ramp(this.busGains.get('environment') ?? null, ambience * AUDIO_BUS_BASE.environment, smooth ? 0.8 : 0);
    for (const bus of ['footsteps', 'interaction', 'memory'] as const) {
      const duck = this.narrationActive && bus === 'memory' ? 0.32 : 1;
      this.ramp(this.busGains.get(bus) ?? null, this.effectsVolume * AUDIO_BUS_BASE[bus] * duck, smooth ? FADE_SECONDS : 0);
    }
    this.ramp(this.busGains.get('music') ?? null, this.ambienceVolume * AUDIO_BUS_BASE.music * (this.narrationActive ? 0.22 : 1), smooth ? 1.4 : 0);
    this.ramp(this.busGains.get('narration') ?? null, this.narrationVolume, smooth ? 0.18 : 0);
    const interior = this.mausoleumNarrowed;
    const fade = smooth ? 2.4 : 0;
    this.rampStream('garden', interior ? 0.055 : AUDIO_STREAM_TARGETS.garden, fade);
    this.rampStream('wind', interior ? 0.025 : AUDIO_STREAM_TARGETS.wind, fade);
    this.rampStream('interior', interior ? 0.68 : 0, fade);
    this.rampStream('music', interior ? 0.42 : AUDIO_STREAM_TARGETS.music, smooth ? 3.2 : 0);
  }

  private rampStream(name: StreamName, value: number, seconds: number): void {
    this.ramp(this.streams.get(name)?.gain ?? null, value, seconds);
  }

  private ramp(node: GainNode | null, value: number, seconds: number): void {
    if (!node || !this.context) return;
    this.rampParam(node.gain, value, seconds);
  }

  private rampParam(param: AudioParam, value: number, seconds: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + Math.max(0.01, seconds));
  }

  private publish(): void {
    this.diagnosticsSnapshot = {
      lifecycle: this.lifecycle,
      muted: this.muted,
      activeVoices: this.voices.size,
      voiceLimit: AUDIO_VOICE_LIMITS[this.quality],
      ambienceActive: this.context !== null && (this.streams.size > 0 || typeof Audio === 'undefined'),
      musicActive: this.streams.get('music')?.started ?? false,
      memoryActive: this.memoryActive,
      footstepCount: this.footstepCount,
      footstepSurface: this.surface,
      fountainGain: this.fountainGain,
      worldZone: this.worldZone,
      decodedBuffers: this.bufferPromises.size,
      masterVolume: this.masterVolume,
      ambienceVolume: this.ambienceVolume,
      effectsVolume: this.effectsVolume,
      narrationVolume: this.narrationVolume,
      narrationActive: this.narrationActive,
      narrationPaused: this.narrationPaused,
      narrationKey: this.narrationKey,
      locomotionSpeed: this.locomotionSpeed,
      locomotionGrounded: this.locomotionGrounded,
    };
    for (const listener of this.listeners) listener();
  }
}

export const audioManager = new AudioManager();
