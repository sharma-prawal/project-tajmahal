import { useEffect, useSyncExternalStore } from 'react';
import { env } from '@config/env';
import { audioManager } from './AudioManager';
import { useState } from 'react';

type AudioCaptureWindow = typeof window & {
  __audioDiagnostics?: typeof audioManager.inspectDiagnostics;
  __audioSetMemoryActive?: (active: boolean) => void;
  __audioSetVolumes?: (master: number, ambience: number, effects: number) => void;
  __audioSetMuted?: (muted: boolean) => void;
  __audioSimulateWalk?: (x: number, z: number, fountainZ: readonly number[]) => void;
  __audioSuspend?: () => Promise<void>;
  __audioResume?: () => Promise<void>;
};

export function AudioDebugControls() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!env.enableDebugTools) return;
    const captureWindow = window as AudioCaptureWindow;
    captureWindow.__audioDiagnostics = audioManager.inspectDiagnostics;
    captureWindow.__audioSetMemoryActive = (active) => audioManager.setMemoryActive(active);
    captureWindow.__audioSetVolumes = (master, ambience, effects) => audioManager.setVolumes({ master, ambience, effects });
    captureWindow.__audioSetMuted = (muted) => audioManager.setMuted(muted);
    captureWindow.__audioSimulateWalk = (x, z, fountainZ) => {
      audioManager.updateSpatialState(x, z, fountainZ);
      for (let index = 0; index < 6; index += 1) {
        audioManager.updateLocomotion({ speed: 2, running: false, grounded: true, enabled: true, nowSeconds: index });
      }
      audioManager.updateLocomotion({ speed: 0, running: false, grounded: true, enabled: true, nowSeconds: 7 });
    };
    captureWindow.__audioSuspend = () => audioManager.suspend();
    captureWindow.__audioResume = () => audioManager.resume();
    const key = (event: KeyboardEvent) => { if (event.code === 'KeyK' && !event.repeat) setActive((value) => !value); };
    window.addEventListener('keydown', key); return () => {
      window.removeEventListener('keydown', key);
      delete captureWindow.__audioDiagnostics; delete captureWindow.__audioSetMemoryActive; delete captureWindow.__audioSetVolumes; delete captureWindow.__audioSetMuted; delete captureWindow.__audioSimulateWalk; delete captureWindow.__audioSuspend; delete captureWindow.__audioResume;
    };
  }, []);
  if (!env.enableDebugTools) return null;
  return <AudioDebugHud active={active} />;
}

function AudioDebugHud({ active }: { active: boolean }) {
  const diagnostics = useSyncExternalStore(audioManager.subscribe, audioManager.getDiagnostics, audioManager.getDiagnostics);
  if (!active) return <div style={{ position: 'fixed', right: 12, bottom: 142, zIndex: 24, color: '#d9c79d', font: '12px monospace' }}>Press K for audio debug</div>;
  return <div role="status" aria-label="Audio diagnostics" style={{ position: 'fixed', right: 12, bottom: 12, width: 310, zIndex: 40, padding: 12, borderRadius: 8, color: '#eee4cd', background: 'rgba(12,15,19,.94)', font: '12px/1.55 monospace' }}>
    <strong>Audio diagnostics (dev only)</strong>
    <div>state: {diagnostics.lifecycle} · muted: {diagnostics.muted ? 'yes' : 'no'}</div>
    <div>ambience: {diagnostics.ambienceActive ? 'active' : 'inactive'} · music: {diagnostics.musicActive ? 'active' : 'inactive'}</div>
    <div>memory duck: {diagnostics.memoryActive ? 'active' : 'off'}</div>
    <div>voices: {diagnostics.activeVoices}/{diagnostics.voiceLimit} · footsteps: {diagnostics.footstepCount}</div>
    <div>zone: {diagnostics.worldZone} · surface: {diagnostics.footstepSurface} · decoded: {diagnostics.decodedBuffers}</div>
    <div>locomotion: {diagnostics.locomotionSpeed.toFixed(2)} · grounded: {diagnostics.locomotionGrounded ? 'yes' : 'no'}</div>
    <div>fountain gain: {diagnostics.fountainGain.toFixed(3)}</div>
    <div>master {diagnostics.masterVolume.toFixed(2)} · ambience {diagnostics.ambienceVolume.toFixed(2)} · effects {diagnostics.effectsVolume.toFixed(2)}</div>
    <div style={{ opacity: .65 }}>[K] close · production CC0 asset mix</div>
  </div>;
}
