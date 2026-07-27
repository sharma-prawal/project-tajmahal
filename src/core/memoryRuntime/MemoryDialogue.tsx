import { useEffect } from 'react';
import { PressLatch } from '@core/interaction/pressLatch';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useDeviceStore } from '@state/useDeviceStore';
import { audioManager } from '@core/audio/AudioManager';
import { NARRATION_ASSETS } from '@core/audio/audioAssets';
import { memoryRuntime } from './MemoryRuntime';
import { useMemoryRuntimeSnapshot } from './useMemoryRuntimeSnapshot';

export function MemoryDialogue() {
  const snapshot = useMemoryRuntimeSnapshot();
  const highContrast = useAccessibilityStore((state) => state.highContrastPrompts);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const controlScheme = useDeviceStore((state) => state.controlScheme);
  const narrationKey = snapshot.activeMemoryId && snapshot.stepId
    ? `memory:${snapshot.activeMemoryId}:${snapshot.stepId}`
    : null;
  const narrationUrl = snapshot.activeMemoryId && snapshot.stepId
    ? NARRATION_ASSETS.memory(snapshot.activeMemoryId, snapshot.stepId)
    : null;
  useEffect(() => {
    if (
      snapshot.lifecycle !== 'awaiting-input'
      || !snapshot.dialogue
      || !narrationKey
      || !narrationUrl
    ) return;
    audioManager.playNarration(narrationKey, narrationUrl);
    return () => audioManager.stopNarration(narrationKey);
  }, [narrationKey, narrationUrl, snapshot.dialogue, snapshot.lifecycle]);
  useEffect(() => {
    const latch = new PressLatch();
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Escape') { memoryRuntime.cancel('user-cancelled'); return; }
      if (!['KeyE', 'Enter', 'Space'].includes(event.code) || !latch.down(event.repeat)) return;
      if (memoryRuntime.acknowledge()) event.preventDefault();
    };
    const up = (event: KeyboardEvent) => { if (['KeyE', 'Enter', 'Space'].includes(event.code)) latch.up(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
  if (!snapshot.dialogue || snapshot.lifecycle !== 'awaiting-input') return null;
  const emphasized = snapshot.dialogue.presentation === 'emphasis';
  return <section data-memory-id={snapshot.activeMemoryId ?? undefined} data-presentation={snapshot.dialogue.presentation} className={`memory-dialogue${emphasized ? ' memory-dialogue--emphasis' : ''}${highContrast ? ' memory-dialogue--contrast' : ''}${reducedMotion ? ' memory-dialogue--reduced' : ''}`} role="dialog" aria-modal="true" aria-label="Memory narration">
    <div className="memory-dialogue__speaker">{snapshot.dialogue.speaker}</div>
    <p>{emphasized ? <strong>{snapshot.dialogue.text}</strong> : snapshot.dialogue.text}</p>
    <div className="memory-dialogue__actions">
      <button type="button" onClick={() => memoryRuntime.acknowledge()}><span>{snapshot.dialogue.continueLabel}</span><span aria-hidden="true" className="memory-dialogue__key">{controlScheme === 'touch' ? 'Tap' : 'E'}</span></button>
      {narrationKey && narrationUrl && <button
        type="button"
        className="memory-dialogue__replay"
        onClick={() => {
          audioManager.stopNarration(narrationKey);
          audioManager.playNarration(narrationKey, narrationUrl);
        }}
      >
        <span aria-hidden="true">◖</span>
        <span>Replay voice</span>
      </button>}
    </div>
  </section>;
}
