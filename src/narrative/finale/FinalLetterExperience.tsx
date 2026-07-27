import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { NARRATION_ASSETS } from '@core/audio/audioAssets';
import { audioManager } from '@core/audio/AudioManager';
import { clearExplorationInput } from '@core/input/clearExplorationInput';
import type { InteractionContext } from '@core/interaction/types';
import { useInteractable } from '@core/interaction/useInteractable';
import { ownershipManager, type OwnershipLease } from '@core/memoryRuntime/OwnershipManager';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { useMemoryRuntimeSnapshot } from '@core/memoryRuntime/useMemoryRuntimeSnapshot';
import { TAJ_LETTER_PLINTH_Z } from '@constants/tajPlacement';
import { FINAL_LETTER_INTERACTION_ID, FINAL_LETTER_PARAGRAPHS } from '@/content/finalLetter';
import { memoryGateProgress, SPINE_MEMORY_COUNT } from '@narrative/memory/memoryProgress';
import { deriveCompletedIds, useMemoryStore } from '@narrative/memory/useMemoryStore';
import { saveManager } from '@core/save/SaveManager';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { subscribeFinalLetterReopen } from './finalLetterReopen';

const FINAL_LETTER_NARRATION_KEY = 'finale:final-letter';
const LETTER_RESOURCES = ['traversal', 'camera', 'interaction', 'narrative-input', 'modal-ui'] as const;

const LETTER_PARAGRAPH_WORDS = FINAL_LETTER_PARAGRAPHS.map((paragraph) => paragraph.split(/\s+/));
const LETTER_TOTAL_WORDS = LETTER_PARAGRAPH_WORDS.reduce((sum, words) => sum + words.length, 0);
const LEAD_FACTOR = 1.15;

/**
 * Estimates spoken progress from playback time rather than real word
 * timestamps (the narration asset carries none) — close enough for a
 * paced reveal, not a frame-accurate caption sync.
 */
function useNarrationWordProgress(narrationKey: string, active: boolean, totalWords: number): number {
  const [revealed, setRevealed] = useState(totalWords);
  useEffect(() => {
    if (!active) return;
    setRevealed(0);
    let frame: number;
    const tick = () => {
      const progress = audioManager.getNarrationProgress(narrationKey);
      if (progress) {
        // Reveal a beat ahead of raw playback time: natural speech carries
        // pauses the word count doesn't model, and matching the fraction
        // exactly reads as the text trailing the voice instead of leading it.
        const fraction = Math.min(1, (progress.currentTime / progress.duration) * LEAD_FACTOR);
        setRevealed(Math.round(fraction * totalWords));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, narrationKey, totalWords]);
  return revealed;
}

export function FinalLetterExperience() {
  const [open, setOpen] = useState(false);
  const interactionContext = useRef<InteractionContext | null>(null);
  const leases = useRef<OwnershipLease[]>([]);
  const completedSpatial = useMemoryStore((state) => deriveCompletedIds(state.phases).length);
  useMemoryRuntimeSnapshot();
  const progress = memoryGateProgress(completedSpatial, memoryRuntime.getCompletedIds().length);
  // The letter is the finale: it waits for every memory, not the door's
  // 5-of-7 threshold, so it cannot open before the seventh is found.
  const unlocked = progress >= SPINE_MEMORY_COUNT;
  // A save already at 7/7 must not replay the reveal on every load: the
  // store starts empty and only fills in once `useAutoSave` restores it a
  // tick after mount, which looks identical to a live 6→7 completion unless
  // we know, synchronously, whether the *save itself* already had all seven.
  // Must mirror `unlocked` above exactly — spine-only undercounts a player
  // who reached 7/7 mainly through the production narratives, which was
  // exactly the mismatch still reopening the letter on reload.
  const wasUnlocked = useRef((() => {
    const save = saveManager.load();
    return memoryGateProgress(save.completedMemoryIds.length, save.runtimeCompletedMemoryIds.length) >= SPINE_MEMORY_COUNT;
  })());
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const audio = useSyncExternalStore(
    audioManager.subscribe,
    audioManager.getDiagnostics,
    audioManager.getDiagnostics,
  );

  const interaction = useMemo(() => ({
    id: FINAL_LETTER_INTERACTION_ID,
    type: 'view-and-proximity' as const,
    position: [0, 1.5, TAJ_LETTER_PLINTH_Z] as const,
    activationDistance: 4.4,
    focusAngleDegrees: 78,
    priority: 110,
    enabled: unlocked,
    behavior: 'repeatable' as const,
    persistence: 'completion' as const,
    completion: 'manual' as const,
    interruption: 'ignore' as const,
    cooldownMs: 650,
    prompt: 'Read the letter',
    completedPrompt: 'Read the letter again',
    accessibilityLabel: 'Read the final letter',
    completedAccessibilityLabel: 'Read the final letter again',
    onActivate: (context: InteractionContext) => {
      interactionContext.current = context;
      clearExplorationInput();
      setOpen(true);
    },
  }), [unlocked]);
  useInteractable(interaction);

  useEffect(() => {
    // Only ever latch false -> true, and only *from* this effect's own
    // observation of a live transition. `unlocked` reads as false on the
    // very first render (the store hasn't hydrated from the save yet) —
    // unconditionally syncing wasUnlocked.current to that stale value here
    // would clobber the seeded "already unlocked at boot" flag right back
    // to false, which is what let hydration masquerade as a fresh 6→7.
    if (unlocked && !wasUnlocked.current) {
      clearExplorationInput();
      setOpen(true);
      wasUnlocked.current = true;
    }
  }, [unlocked]);

  useEffect(() => {
    const listener = () => {
      if (!unlocked) return;
      clearExplorationInput();
      setOpen(true);
    };
    return subscribeFinalLetterReopen(listener);
  }, [unlocked]);

  const closeLetter = useCallback(() => {
    audioManager.stopNarration(FINAL_LETTER_NARRATION_KEY);
    interactionContext.current?.complete();
    interactionContext.current = null;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    leases.current = LETTER_RESOURCES
      .map((resource) => ownershipManager.acquire(resource, FINAL_LETTER_INTERACTION_ID))
      .filter((lease): lease is OwnershipLease => lease !== null);
    audioManager.playNarration(FINAL_LETTER_NARRATION_KEY, NARRATION_ASSETS.finalLetter);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeLetter();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      audioManager.stopNarration(FINAL_LETTER_NARRATION_KEY);
      while (leases.current.length) leases.current.pop()?.release();
    };
  }, [closeLetter, open]);

  const narrationIsCurrent = audio.narrationKey === FINAL_LETTER_NARRATION_KEY;
  const revealedWords = useNarrationWordProgress(
    FINAL_LETTER_NARRATION_KEY,
    open && !reducedMotion && narrationIsCurrent && audio.narrationActive,
    LETTER_TOTAL_WORDS,
  );
  const wordsToShow = reducedMotion || !narrationIsCurrent ? LETTER_TOTAL_WORDS : revealedWords;

  if (!open) return null;

  return (
    <section
      className={`final-letter${reducedMotion ? ' final-letter--reduced' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-letter-title"
    >
      <div className="final-letter__paper">
        <header className="final-letter__header">
          <div>
            <div className="modal-kicker">Every memory has returned</div>
            <h1 id="final-letter-title">A letter for you</h1>
          </div>
          <button type="button" className="icon-button" onClick={closeLetter} aria-label="Close the letter">×</button>
        </header>
        <div className="final-letter__voice" aria-label="Letter narration controls">
          <span className="final-letter__voice-mark" aria-hidden="true">◖</span>
          <span>
            <strong>Listen to the letter</strong>
            <small>A quiet, human-paced reading</small>
          </span>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              if (audio.narrationPaused) audioManager.resumeNarration();
              else if (audio.narrationActive && narrationIsCurrent) audioManager.pauseNarration();
              else audioManager.playNarration(FINAL_LETTER_NARRATION_KEY, NARRATION_ASSETS.finalLetter);
            }}
          >
            {audio.narrationPaused && narrationIsCurrent
              ? 'Resume'
              : audio.narrationActive && narrationIsCurrent
                ? 'Pause'
                : 'Listen'}
          </button>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              audioManager.stopNarration(FINAL_LETTER_NARRATION_KEY);
              audioManager.playNarration(FINAL_LETTER_NARRATION_KEY, NARRATION_ASSETS.finalLetter);
            }}
          >
            Restart
          </button>
        </div>
        <article className="final-letter__body">
          {(() => {
            let wordIndex = 0;
            return LETTER_PARAGRAPH_WORDS.map((words, index) => {
              const paragraphStart = wordIndex;
              wordIndex += words.length;
              return (
                <p key={FINAL_LETTER_PARAGRAPHS[index]} data-emphasis={index === 9 || undefined}>
                  {words.map((word, wordOffset) => (
                    <span
                      key={wordOffset}
                      className={`final-letter__word${paragraphStart + wordOffset < wordsToShow ? ' final-letter__word--revealed' : ''}`}
                    >
                      {word}{' '}
                    </span>
                  ))}
                </p>
              );
            });
          })()}
        </article>
        <footer className="final-letter__footer">
          <span>Take all the time you need.</span>
          <button type="button" className="button-primary" onClick={closeLetter}>Close the letter</button>
        </footer>
      </div>
    </section>
  );
}
